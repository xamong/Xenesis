using System.Text.Json;
using System.Text.Json.Serialization;
using Xenesis.WindowsControlHost.Contracts;
using Xenesis.WindowsControlHost.Providers;

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = false
};

try
{
    HostResponse response;

    if (args.Any(arg => string.Equals(arg, "--self-test", StringComparison.OrdinalIgnoreCase)))
    {
        response = CreateSelfTestResponse();
    }
    else
    {
        var input = await Console.In.ReadToEndAsync();
        var request = string.IsNullOrWhiteSpace(input)
            ? new HostRequest()
            : JsonSerializer.Deserialize<HostRequest>(input, jsonOptions) ?? new HostRequest();
        request.Target ??= new HostTarget();
        request.Options ??= new HostOptions();

        response = Dispatch(request);
    }

    Console.WriteLine(JsonSerializer.Serialize(response, jsonOptions));
    return response.Ok ? 0 : 2;
}
catch (JsonException)
{
    var response = new HostResponse
    {
        Ok = false,
        Action = "unknown",
        Code = "invalid_request",
        Error = "Invalid host request JSON.",
        Message = "Windows Control Host request is invalid."
    };

    Console.WriteLine(JsonSerializer.Serialize(response, jsonOptions));
    return 2;
}
catch (Exception ex)
{
    var response = new HostResponse
    {
        Ok = false,
        Action = "unknown",
        Code = "host_unhandled_error",
        Error = ex.Message,
        Message = "Windows Control Host failed."
    };

    Console.WriteLine(JsonSerializer.Serialize(response, jsonOptions));
    return 2;
}

static HostResponse Dispatch(HostRequest request)
{
    var action = request.Action;

    if (string.IsNullOrWhiteSpace(action))
    {
        return new HostResponse
        {
            Ok = false,
            Action = "unknown",
            Code = "unsupported_action",
            Error = "Host action is required.",
            Message = "External app unknown failed."
        };
    }

    return action switch
    {
        "inspect" => Inspect(request),
        "elementFromPoint" => ElementFromPoint(request),
        "tree" => Tree(request),
        "highlight" => Highlight(request),
        "captureElement" => CaptureElement(request),
        _ => new HostResponse
        {
            Ok = false,
            Action = action,
            Code = "unsupported_action",
            Error = $"Unsupported host action: {action}.",
            Message = $"Unsupported host action: {action}."
        }
    };
}

static HostResponse Inspect(HostRequest request)
{
    const string action = "inspect";
    var resolution = TargetResolver.ResolveWindow(request);
    if (!resolution.Resolved)
    {
        return CreateResolverFailureResponse(action, resolution);
    }

    var hwnd = resolution.Handle;
    var target = Win32Provider.TargetFromHandle(hwnd, request.Target.AppId);
    var observation = UiaProvider.FromWindow(hwnd)
        ?? MsaaProvider.FromWindow(hwnd)
        ?? Win32Provider.ElementFromHandle(hwnd);

    return new HostResponse
    {
        Ok = true,
        Action = action,
        Target = target,
        Observation = observation,
        Windows =
        [
            new HostWindowInfo
            {
                WindowId = target.WindowId ?? "",
                ProcessId = target.ProcessId,
                Title = target.Title ?? "",
                Bounds = target.Bounds
            }
        ],
        Message = "External app inspect completed."
    };
}

static HostResponse ElementFromPoint(HostRequest request)
{
    const string action = "elementFromPoint";
    var resolution = TargetResolver.ResolvePointWindow(request);
    if (!resolution.Resolved)
    {
        return CreateResolverFailureResponse(action, resolution);
    }

    return new HostResponse
    {
        Ok = true,
        Action = action,
        Target = Win32Provider.TargetFromHandle(resolution.Handle, request.Target.AppId),
        Observation = UiaProvider.FromPoint(request.Target.X!.Value, request.Target.Y!.Value)
            ?? MsaaProvider.FromPoint(request.Target.X!.Value, request.Target.Y!.Value)
            ?? Win32Provider.ElementFromHandle(resolution.ObservationHandle),
        Message = "External app elementFromPoint completed."
    };
}

static HostResponse Tree(HostRequest request)
{
    const string action = "tree";
    var resolution = TargetResolver.ResolveWindow(request);
    if (!resolution.Resolved)
    {
        return CreateResolverFailureResponse(action, resolution);
    }

    var hwnd = resolution.Handle;
    var depth = Math.Clamp(request.Options.Depth ?? 3, 1, 20);
    var limit = Math.Clamp(request.Options.Limit ?? 200, 1, 1000);
    var tree = TryUiaTree(hwnd, depth, limit, request.Options.IncludeValues != false)
        ?? Win32Provider.ChildTree(hwnd, depth, limit);
    var truncated = tree.Count >= limit;

    return new HostResponse
    {
        Ok = true,
        Action = action,
        Target = Win32Provider.TargetFromHandle(hwnd, request.Target.AppId),
        Tree = tree,
        Truncated = truncated,
        NextHint = truncated ? "Increase limit or inspect a narrower target." : null,
        Message = "External app tree completed."
    };
}

static HostResponse? ResolveVisualTarget(
    string action,
    HostRequest request,
    out HostObservationTarget? target,
    out HostElementInfo? element,
    out HostBounds? bounds)
{
    target = null;
    element = null;
    bounds = null;

    var resolution = TargetResolver.ResolveWindow(request);
    var hasElementRefTarget = HasElementRefTarget(request);
    if (!resolution.Resolved && (!hasElementRefTarget || HasNonElementTargetConstraints(request)))
    {
        return CreateResolverFailureResponse(action, resolution);
    }

    target = resolution.Resolved
        ? Win32Provider.TargetFromHandle(resolution.Handle, request.Target.AppId)
        : null;

    if (!hasElementRefTarget)
    {
        bounds = target?.Bounds;
        return null;
    }

    if (resolution.Resolved
        && Win32Provider.TryGetHandleFromElementRef(request.Target.ElementRef, out var constrainedElementHandle)
        && !Win32Provider.IsSameOrDescendant(resolution.Handle, constrainedElementHandle))
    {
        return new HostResponse
        {
            Ok = false,
            Action = action,
            Code = "element_ref_target_mismatch",
            Error = "Element reference is outside the resolved target window.",
            Message = $"External app {action} failed.",
            Target = target
        };
    }

    var elementResolution = ElementRefResolver.Resolve(request, resolution.Handle);
    if (!elementResolution.Ok || elementResolution.Element is null)
    {
        return new HostResponse
        {
            Ok = false,
            Action = action,
            Code = elementResolution.Code ?? "element_ref_not_found",
            Error = elementResolution.Error ?? "Element reference could not be resolved.",
            Message = $"External app {action} failed.",
            Target = target,
            Observation = elementResolution.Element
        };
    }

    element = elementResolution.Element;
    if (resolution.Resolved
        && string.Equals(element.Provider, "win32", StringComparison.OrdinalIgnoreCase)
        && (!Win32Provider.TryGetHandleFromElementRef(element.ElementRef, out var elementHandle)
            || !Win32Provider.IsSameOrDescendant(resolution.Handle, elementHandle)))
    {
        return new HostResponse
        {
            Ok = false,
            Action = action,
            Code = "element_ref_target_mismatch",
            Error = "Element reference is outside the resolved target window.",
            Message = $"External app {action} failed.",
            Target = target
        };
    }

    bounds = element.Bounds;
    target ??= TargetFromElement(request, element);
    return null;
}

static HostResponse CaptureElement(HostRequest request)
{
    const string action = "captureElement";
    var failure = ResolveVisualTarget(action, request, out var target, out var element, out var bounds);
    if (failure is not null)
    {
        return failure;
    }

    if (bounds is null)
    {
        return new HostResponse
        {
            Ok = false,
            Action = action,
            Code = "capture_failed",
            Error = "Target bounds could not be captured.",
            Message = "External app captureElement failed.",
            Target = target
        };
    }

    string screenshotPath;
    try
    {
        screenshotPath = CaptureProvider.CaptureBounds(bounds, request.Options.ScreenshotPath);
    }
    catch (Exception ex)
    {
        return new HostResponse
        {
            Ok = false,
            Action = action,
            Code = "capture_failed",
            Error = $"Capture failed: {ex.Message}",
            Message = "External app captureElement failed.",
            Target = target,
            Observation = element
        };
    }

    return new HostResponse
    {
        Ok = true,
        Action = action,
        Target = target,
        Observation = element,
        ScreenshotPath = screenshotPath,
        Screenshot = new HostScreenshotInfo
        {
            Path = screenshotPath,
            ElementRef = element?.ElementRef,
            Source = element?.Provider,
            Bounds = bounds
        },
        Message = "External app captureElement completed."
    };
}

static HostResponse Highlight(HostRequest request)
{
    const string action = "highlight";
    var failure = ResolveVisualTarget(action, request, out var target, out var element, out var bounds);
    if (failure is not null)
    {
        return failure;
    }

    if (bounds is null)
    {
        return new HostResponse
        {
            Ok = false,
            Action = action,
            Code = "highlight_failed",
            Error = "Target bounds could not be highlighted.",
            Message = "External app highlight failed.",
            Target = target
        };
    }

    var durationMs = NormalizeHighlightDuration(request.Options.DurationMs);
    try
    {
        HighlightProvider.Show(bounds, durationMs);
    }
    catch (Exception ex)
    {
        return new HostResponse
        {
            Ok = false,
            Action = action,
            Code = "highlight_failed",
            Error = $"Highlight failed: {ex.Message}",
            Message = "External app highlight failed.",
            Target = target,
            Observation = element
        };
    }

    return new HostResponse
    {
        Ok = true,
        Action = action,
        Target = target,
        Observation = element,
        Highlight = new HostHighlightInfo
        {
            ElementRef = element?.ElementRef,
            Source = element?.Provider,
            DurationMs = durationMs,
            Bounds = bounds
        },
        Message = "External app highlight completed."
    };
}

static int NormalizeHighlightDuration(int? durationMs)
{
    return Math.Clamp(durationMs ?? 1200, 100, 10000);
}

static HostObservationTarget TargetFromElement(HostRequest request, HostElementInfo element)
{
    return new HostObservationTarget
    {
        AppId = request.Target.AppId,
        WindowId = TryGetWin32WindowId(element.ElementRef),
        Title = element.Name,
        ClassName = element.ClassName,
        Bounds = element.Bounds
    };
}

static string? TryGetWin32WindowId(string? elementRef)
{
    const string prefix = "win32:";
    return elementRef is not null && elementRef.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
        ? elementRef[prefix.Length..]
        : null;
}

static bool HasElementRefTarget(HostRequest request)
{
    return !string.IsNullOrWhiteSpace(request.Target.ElementRef);
}

static bool HasNonElementTargetConstraints(HostRequest request)
{
    return !string.IsNullOrWhiteSpace(request.Target.AppId)
        || !string.IsNullOrWhiteSpace(request.Target.Executable)
        || !string.IsNullOrWhiteSpace(request.Target.Path)
        || !string.IsNullOrWhiteSpace(request.Target.ProcessName)
        || !string.IsNullOrWhiteSpace(request.Target.TitleContains)
        || !string.IsNullOrWhiteSpace(request.Target.WindowId);
}

static List<HostElementInfo>? TryUiaTree(IntPtr hwnd, int depth, int limit, bool includeValues)
{
    try
    {
        var tree = UiaProvider.TreeFromWindow(hwnd, depth, limit, includeValues);
        return tree.Count == 0 ? null : tree;
    }
    catch
    {
        return null;
    }
}

static HostResponse CreateSelfTestResponse()
{
    return new HostResponse
    {
        Ok = true,
        Action = "selfTest",
        Message = "Windows Control Host self-test completed.",
        Observation = new HostElementInfo
        {
            ElementRef = "self:self-test",
            Provider = "win32",
            Name = "self-test"
        }
    };
}

static HostResponse CreateResolverFailureResponse(string action, TargetResolutionResult resolution)
{
    var message = resolution.Message ?? "Target window was not found.";
    return new HostResponse
    {
        Ok = false,
        Action = action,
        Code = resolution.Code ?? "target_not_found",
        Error = message,
        Message = message,
        Windows = resolution.Windows
    };
}
