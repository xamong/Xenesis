using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = false
};

try
{
    var input = await Console.In.ReadToEndAsync();
    var request = string.IsNullOrWhiteSpace(input)
        ? new OfficeHostRequest { Action = "status" }
        : JsonSerializer.Deserialize<OfficeHostRequest>(input, jsonOptions) ?? new OfficeHostRequest { Action = "status" };
    request.Action = string.IsNullOrWhiteSpace(request.Action) ? "status" : request.Action;

    var response = Dispatch(request);
    Console.WriteLine(JsonSerializer.Serialize(response, jsonOptions));
    return response.Ok ? 0 : 2;
}
catch (JsonException)
{
    Console.WriteLine(JsonSerializer.Serialize(OfficeHostResponse.Fail("status", "invalid_request", "Invalid Office host request JSON."), jsonOptions));
    return 2;
}
catch (Exception ex)
{
    Console.WriteLine(JsonSerializer.Serialize(OfficeHostResponse.Fail("status", "host_unhandled_error", ex.Message), jsonOptions));
    return 2;
}

static OfficeHostResponse Dispatch(OfficeHostRequest request)
{
    return request.Action switch
    {
        "status" => OfficeStatus(),
        "excel.openWorkbook" => ExcelOpenWorkbook(request),
        "excel.readRange" => ExcelReadRange(request),
        "excel.writeRange" => ExcelWriteRange(request),
        "excel.saveWorkbook" => ExcelSaveWorkbook(request),
        "excel.closeWorkbook" => ExcelCloseWorkbook(request),
        "excel.exportPdf" => ExcelExportPdf(request),
        _ => OfficeHostResponse.Fail(request.Action, "unsupported_action", $"Unsupported Office host action: {request.Action}.")
    };
}

static OfficeHostResponse OfficeStatus()
{
    var excel = ProbeComApplication("Excel.Application");
    var word = ProbeComApplication("Word.Application");
    var powerpoint = ProbeComApplication("PowerPoint.Application");
    var provider = new OfficeProviderStatus
    {
        Id = "windows-com",
        Available = excel.Available,
        Apps = excel.Available ? ["excel"] : [],
        Message = excel.Available ? "Microsoft Excel COM automation is available." : "Microsoft Excel COM automation is not available.",
        Details = new Dictionary<string, object?>
        {
            ["excel"] = excel,
            ["word"] = word,
            ["powerpoint"] = powerpoint
        }
    };

    return new OfficeHostResponse
    {
        Ok = true,
        Action = "status",
        Providers = [provider],
        Message = "Office provider status read."
    };
}

static ComProbeResult ProbeComApplication(string progId)
{
    object? app = null;
    try
    {
        var type = Type.GetTypeFromProgID(progId);
        if (type is null)
        {
            return new ComProbeResult { ProgId = progId, Available = false };
        }

        app = Activator.CreateInstance(type);
        var version = TryGetComProperty(app, "Version");
        TryInvokeCom(app, "Quit");
        return new ComProbeResult
        {
            ProgId = progId,
            Available = true,
            Version = version?.ToString()
        };
    }
    catch (Exception ex)
    {
        return new ComProbeResult
        {
            ProgId = progId,
            Available = false,
            Error = ex.Message
        };
    }
    finally
    {
        ReleaseCom(app);
    }
}

static OfficeHostResponse ExcelOpenWorkbook(OfficeHostRequest request)
{
    return WithWorkbook(request, saveOnClose: false, readOnlyDefault: true, (context) =>
    {
        return OfficeHostResponse.Success(request.Action, request.Path)
            with
            {
                Sheets = GetSheetSummaries(context.Workbook),
                Message = "Excel workbook opened."
            };
    });
}

static OfficeHostResponse ExcelReadRange(OfficeHostRequest request)
{
    if (string.IsNullOrWhiteSpace(request.SheetName) || string.IsNullOrWhiteSpace(request.Range))
    {
        return OfficeHostResponse.Fail(request.Action, "range_required", "Excel readRange requires sheetName and range.");
    }

    return WithWorkbook(request, saveOnClose: false, readOnlyDefault: true, (context) =>
    {
        dynamic sheet = GetWorksheet(context.Workbook, request.SheetName);
        dynamic range = sheet.Range[request.Range];
        return OfficeHostResponse.Success(request.Action, request.Path)
            with
            {
                Rows = NormalizeComRangeValue(range.Value2),
                Message = "Excel range read."
            };
    });
}

static OfficeHostResponse ExcelWriteRange(OfficeHostRequest request)
{
    if (string.IsNullOrWhiteSpace(request.SheetName) || string.IsNullOrWhiteSpace(request.StartCell))
    {
        return OfficeHostResponse.Fail(request.Action, "range_required", "Excel writeRange requires sheetName and startCell.");
    }
    if (request.Rows is null || request.Rows.Count == 0)
    {
        return OfficeHostResponse.Fail(request.Action, "rows_required", "Excel writeRange requires rows.");
    }

    return WithWorkbook(request, saveOnClose: request.Save, readOnlyDefault: false, (context) =>
    {
        var rowCount = request.Rows.Count;
        var columnCount = Math.Max(1, request.Rows.Max(row => row.Count));
        dynamic sheet = GetWorksheet(context.Workbook, request.SheetName);
        dynamic start = sheet.Range[request.StartCell];
        dynamic target = start.Resize[rowCount, columnCount];
        target.Value2 = ToComArray(request.Rows, rowCount, columnCount);
        if (request.Save)
        {
            context.Workbook.Save();
        }

        return OfficeHostResponse.Success(request.Action, request.Path)
            with
            {
                Message = request.Save ? "Excel range written and workbook saved." : "Excel range written."
            };
    });
}

static OfficeHostResponse ExcelSaveWorkbook(OfficeHostRequest request)
{
    var savePath = NormalizeOptionalPath(request.SaveAsPath);
    if (!string.IsNullOrWhiteSpace(savePath) && File.Exists(savePath) && !request.Overwrite)
    {
        return OfficeHostResponse.Fail(request.Action, "overwrite_required", "Target workbook already exists. Set overwrite to true.");
    }

    return WithWorkbook(request, saveOnClose: true, readOnlyDefault: false, (context) =>
    {
        if (!string.IsNullOrWhiteSpace(savePath))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(savePath) ?? ".");
            context.Workbook.SaveAs(savePath);
        }
        else
        {
            context.Workbook.Save();
        }

        return OfficeHostResponse.Success(request.Action, savePath ?? request.Path)
            with
            {
                Message = "Excel workbook saved."
            };
    });
}

static OfficeHostResponse ExcelCloseWorkbook(OfficeHostRequest request)
{
    return OfficeHostResponse.Success(request.Action, request.Path)
        with
        {
            Warnings = ["Stateless Office COM provider has no persistent workbook session."],
            Message = "Excel workbook close acknowledged."
        };
}

static OfficeHostResponse ExcelExportPdf(OfficeHostRequest request)
{
    var outputPath = NormalizeOptionalPath(request.OutputPath);
    if (string.IsNullOrWhiteSpace(outputPath))
    {
        return OfficeHostResponse.Fail(request.Action, "output_path_required", "Excel exportPdf requires outputPath.");
    }
    if (File.Exists(outputPath) && !request.Overwrite)
    {
        return OfficeHostResponse.Fail(request.Action, "overwrite_required", "Target PDF already exists. Set overwrite to true.");
    }

    return WithWorkbook(request, saveOnClose: false, readOnlyDefault: true, (context) =>
    {
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath) ?? ".");
        context.Workbook.ExportAsFixedFormat(0, outputPath);
        return OfficeHostResponse.Success(request.Action, request.Path)
            with
            {
                OutputPath = outputPath,
                Message = "Excel workbook exported to PDF."
            };
    });
}

static OfficeHostResponse WithWorkbook(
    OfficeHostRequest request,
    bool saveOnClose,
    bool readOnlyDefault,
    Func<ExcelContext, OfficeHostResponse> operation)
{
    var workbookPath = NormalizeRequiredPath(request.Action, request.Path);
    if (workbookPath.Error is not null)
    {
        return workbookPath.Error;
    }

    object? appObject = null;
    object? workbookObject = null;
    try
    {
        var excelType = Type.GetTypeFromProgID("Excel.Application");
        if (excelType is null)
        {
            return OfficeHostResponse.Fail(request.Action, "excel_not_installed", "Microsoft Excel COM automation is not registered.");
        }

        appObject = Activator.CreateInstance(excelType);
        if (appObject is null)
        {
            return OfficeHostResponse.Fail(request.Action, "com_launch_failed", "Microsoft Excel COM automation could not be started.");
        }

        dynamic app = appObject;
        app.Visible = request.Visible;
        app.DisplayAlerts = false;
        TrySetComProperty(appObject, "AutomationSecurity", 3);

        dynamic workbooks = app.Workbooks;
        workbookObject = workbooks.Open(workbookPath.Path, 0, request.ReadOnly || readOnlyDefault);
        dynamic workbook = workbookObject;

        var result = operation(new ExcelContext(app, workbook));
        workbook.Close(saveOnClose);
        app.Quit();
        return result;
    }
    catch (FileNotFoundException ex)
    {
        return OfficeHostResponse.Fail(request.Action, "document_not_found", ex.Message);
    }
    catch (Exception ex)
    {
        return OfficeHostResponse.Fail(request.Action, "com_operation_failed", ex.Message);
    }
    finally
    {
        TryInvokeCom(workbookObject, "Close", false);
        TryInvokeCom(appObject, "Quit");
        ReleaseCom(workbookObject);
        ReleaseCom(appObject);
        GC.Collect();
        GC.WaitForPendingFinalizers();
    }
}

static (string? Path, OfficeHostResponse? Error) NormalizeRequiredPath(string action, string? rawPath)
{
    var normalizedPath = NormalizeOptionalPath(rawPath);
    if (string.IsNullOrWhiteSpace(normalizedPath))
    {
        return (null, OfficeHostResponse.Fail(action, "document_not_found", "Workbook path is required."));
    }
    if (!File.Exists(normalizedPath))
    {
        return (null, OfficeHostResponse.Fail(action, "document_not_found", $"Workbook was not found: {normalizedPath}"));
    }
    return (normalizedPath, null);
}

static string? NormalizeOptionalPath(string? rawPath)
{
    return string.IsNullOrWhiteSpace(rawPath) ? null : Path.GetFullPath(rawPath);
}

static dynamic GetWorksheet(dynamic workbook, string sheetName)
{
    return workbook.Worksheets.Item[sheetName];
}

static List<OfficeSheetSummary> GetSheetSummaries(dynamic workbook)
{
    var summaries = new List<OfficeSheetSummary>();
    dynamic worksheets = workbook.Worksheets;
    int count = worksheets.Count;
    for (var index = 1; index <= count; index++)
    {
        dynamic sheet = worksheets.Item[index];
        dynamic usedRange = sheet.UsedRange;
        summaries.Add(new OfficeSheetSummary
        {
            Name = Convert.ToString(sheet.Name) ?? $"Sheet{index}",
            RowCount = SafeComCount(usedRange.Rows),
            ColumnCount = SafeComCount(usedRange.Columns)
        });
    }
    return summaries;
}

static int SafeComCount(dynamic collection)
{
    try
    {
        return Convert.ToInt32(collection.Count);
    }
    catch
    {
        return 0;
    }
}

static object?[,] ToComArray(List<List<JsonElement>> rows, int rowCount, int columnCount)
{
    var values = new object?[rowCount, columnCount];
    for (var row = 0; row < rowCount; row++)
    {
        for (var column = 0; column < columnCount; column++)
        {
            values[row, column] = column < rows[row].Count ? JsonElementToCellValue(rows[row][column]) : null;
        }
    }
    return values;
}

static object? JsonElementToCellValue(JsonElement cell)
{
    return cell.ValueKind switch
    {
        JsonValueKind.Null => null,
        JsonValueKind.False => false,
        JsonValueKind.True => true,
        JsonValueKind.Number => cell.TryGetInt64(out var integer) ? integer : cell.GetDouble(),
        JsonValueKind.String => cell.GetString(),
        _ => cell.ToString()
    };
}

static List<List<object?>> NormalizeComRangeValue(object? value)
{
    if (value is null)
    {
        return [[]];
    }
    if (value is Array array && array.Rank == 2)
    {
        var rows = new List<List<object?>>();
        var rowStart = array.GetLowerBound(0);
        var rowEnd = array.GetUpperBound(0);
        var columnStart = array.GetLowerBound(1);
        var columnEnd = array.GetUpperBound(1);
        for (var row = rowStart; row <= rowEnd; row++)
        {
            var cells = new List<object?>();
            for (var column = columnStart; column <= columnEnd; column++)
            {
                cells.Add(array.GetValue(row, column));
            }
            rows.Add(cells);
        }
        return rows;
    }
    return [[value]];
}

static object? TryGetComProperty(object? target, string propertyName)
{
    if (target is null) return null;
    try
    {
        return target.GetType().InvokeMember(propertyName, System.Reflection.BindingFlags.GetProperty, null, target, null);
    }
    catch
    {
        return null;
    }
}

static void TrySetComProperty(object? target, string propertyName, object value)
{
    if (target is null) return;
    try
    {
        target.GetType().InvokeMember(propertyName, System.Reflection.BindingFlags.SetProperty, null, target, [value]);
    }
    catch
    {
    }
}

static void TryInvokeCom(object? target, string methodName, params object[] args)
{
    if (target is null) return;
    try
    {
        target.GetType().InvokeMember(methodName, System.Reflection.BindingFlags.InvokeMethod, null, target, args);
    }
    catch
    {
    }
}

static void ReleaseCom(object? target)
{
    if (target is null) return;
    try
    {
        if (Marshal.IsComObject(target))
        {
            Marshal.FinalReleaseComObject(target);
        }
    }
    catch
    {
    }
}

public sealed class OfficeHostRequest
{
    public string Action { get; set; } = "status";
    public string Provider { get; set; } = "windows-com";
    public string? DocumentType { get; set; }
    public string? Path { get; set; }
    public string? OutputPath { get; set; }
    public bool Overwrite { get; set; }
    public bool Visible { get; set; }
    public bool ReadOnly { get; set; }
    public bool ReuseExisting { get; set; }
    public bool Save { get; set; }
    public string? SheetName { get; set; }
    public string? Range { get; set; }
    public string? StartCell { get; set; }
    public List<List<JsonElement>>? Rows { get; set; }
    public string? SaveAsPath { get; set; }
}

public sealed record ExcelContext(dynamic App, dynamic Workbook);

public sealed record OfficeHostResponse
{
    public bool Ok { get; init; }
    public string Action { get; init; } = "status";
    public string? DocumentType { get; init; }
    public string? Provider { get; init; }
    public string? Path { get; init; }
    public string? OutputPath { get; init; }
    public List<OfficeProviderStatus>? Providers { get; init; }
    public List<OfficeSheetSummary>? Sheets { get; init; }
    public List<List<object?>>? Rows { get; init; }
    public List<string>? Warnings { get; init; }
    public string Message { get; init; } = "";
    public string? Code { get; init; }
    public string? Error { get; init; }

    public static OfficeHostResponse Success(string action, string? path)
    {
        return new OfficeHostResponse
        {
            Ok = true,
            Action = action,
            DocumentType = action.StartsWith("excel.", StringComparison.OrdinalIgnoreCase) ? "excel" : null,
            Provider = action == "status" ? null : "windows-com",
            Path = path,
            Message = "Office host action completed."
        };
    }

    public static OfficeHostResponse Fail(string action, string code, string message)
    {
        return new OfficeHostResponse
        {
            Ok = false,
            Action = action,
            Provider = action == "status" ? null : "windows-com",
            Code = code,
            Error = message,
            Message = message
        };
    }
}

public sealed class OfficeProviderStatus
{
    public string Id { get; set; } = "windows-com";
    public bool Available { get; set; }
    public List<string> Apps { get; set; } = [];
    public string? Message { get; set; }
    public Dictionary<string, object?>? Details { get; set; }
}

public sealed class ComProbeResult
{
    public string ProgId { get; set; } = "";
    public bool Available { get; set; }
    public string? Version { get; set; }
    public string? Error { get; set; }
}

public sealed class OfficeSheetSummary
{
    public string Name { get; set; } = "";
    public int RowCount { get; set; }
    public int ColumnCount { get; set; }
}
