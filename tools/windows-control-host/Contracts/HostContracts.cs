namespace Xenesis.WindowsControlHost.Contracts;

public sealed class HostRequest
{
    public string Action { get; set; } = "";
    public HostTarget Target { get; set; } = new();
    public HostOptions Options { get; set; } = new();
}

public sealed class HostTarget
{
    public string? AppId { get; set; }
    public string? Executable { get; set; }
    public string? Path { get; set; }
    public string? ProcessName { get; set; }
    public string? TitleContains { get; set; }
    public string? WindowId { get; set; }
    public string? ElementRef { get; set; }
    public int? X { get; set; }
    public int? Y { get; set; }
}

public sealed class HostOptions
{
    public int? Depth { get; set; }
    public int? Limit { get; set; }
    public int? DurationMs { get; set; }
    public bool? IncludeValues { get; set; }
    public bool? IncludeFullTree { get; set; }
    public bool? IncludeTreePreview { get; set; }
    public string? ScreenshotPath { get; set; }
}

public sealed class HostResponse
{
    public bool Ok { get; set; }
    public string Action { get; set; } = "";
    public string ApprovalLevel { get; set; } = "low";
    public List<HostWindowInfo> Windows { get; set; } = [];
    public string Message { get; set; } = "";
    public string? Error { get; set; }
    public string? Code { get; set; }
    public HostObservationTarget? Target { get; set; }
    public HostElementInfo? Observation { get; set; }
    public List<HostElementInfo>? Tree { get; set; }
    public bool? Truncated { get; set; }
    public string? NextHint { get; set; }
    public List<string>? Warnings { get; set; }
    public string? ScreenshotPath { get; set; }
    public HostScreenshotInfo? Screenshot { get; set; }
    public HostHighlightInfo? Highlight { get; set; }
}

public sealed class HostWindowInfo
{
    public string WindowId { get; set; } = "";
    public int? ProcessId { get; set; }
    public string Title { get; set; } = "";
    public HostBounds? Bounds { get; set; }
    public bool? IsForeground { get; set; }
}

public sealed class HostObservationTarget
{
    public string? AppId { get; set; }
    public string? WindowId { get; set; }
    public string? ProcessName { get; set; }
    public string? Title { get; set; }
    public string? ClassName { get; set; }
    public int? ProcessId { get; set; }
    public HostBounds? Bounds { get; set; }
}

public sealed class HostElementInfo
{
    public string ElementRef { get; set; } = "";
    public string Provider { get; set; } = "win32";
    public string? Name { get; set; }
    public string? Role { get; set; }
    public string? Value { get; set; }
    public string? AutomationId { get; set; }
    public string? ClassName { get; set; }
    public List<string>? State { get; set; }
    public HostBounds? Bounds { get; set; }
    public List<HostElementInfo>? Children { get; set; }
    public int? ChildCount { get; set; }
    public bool? Truncated { get; set; }
}

public sealed class HostBounds
{
    public int X { get; set; }
    public int Y { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}

public sealed class HostScreenshotInfo
{
    public string? Path { get; set; }
    public string? ElementRef { get; set; }
    public string? Source { get; set; }
    public HostBounds? Bounds { get; set; }
}

public sealed class HostHighlightInfo
{
    public string? ElementRef { get; set; }
    public string? Source { get; set; }
    public int? DurationMs { get; set; }
    public HostBounds? Bounds { get; set; }
}
