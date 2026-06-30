using System.Diagnostics;
using Xenesis.WindowsControlHost.Contracts;

namespace Xenesis.WindowsControlHost.Providers;

public sealed class TargetResolutionResult
{
    public IntPtr Handle { get; init; }
    public IntPtr ObservationHandle { get; init; }
    public string? Code { get; init; }
    public string? Message { get; init; }
    public List<HostWindowInfo> Windows { get; init; } = [];

    public bool Resolved => Handle != IntPtr.Zero;

    public static TargetResolutionResult Success(IntPtr handle, IntPtr? observationHandle = null)
    {
        return new TargetResolutionResult
        {
            Handle = handle,
            ObservationHandle = observationHandle ?? handle
        };
    }

    public static TargetResolutionResult Failure(string code, string message, List<HostWindowInfo>? windows = null)
    {
        return new TargetResolutionResult
        {
            Code = code,
            Message = message,
            Windows = windows ?? []
        };
    }
}

public static class TargetResolver
{
    public static TargetResolutionResult ResolveWindow(HostRequest request)
    {
        var constraints = TargetConstraints.FromRequest(request);

        if (TryGetExplicitWindowHandle(request, out var explicitHandle, out var explicitFailure))
        {
            if (!Win32Provider.IsVisibleWindow(explicitHandle) || !constraints.Matches(explicitHandle))
            {
                return TargetResolutionResult.Failure("target_not_found", "Target window was not found.");
            }

            return TargetResolutionResult.Success(explicitHandle);
        }

        if (explicitFailure is not null)
        {
            return explicitFailure;
        }

        var hasMatcher = constraints.HasAnyMatcher;
        if (!hasMatcher)
        {
            return TargetResolutionResult.Failure("target_not_found", "Target window was not found.");
        }

        var candidates = Win32Provider.EnumerateTopLevelWindows()
            .Where(constraints.Matches)
            .Distinct()
            .ToList();

        if (candidates.Count == 0)
        {
            candidates = ResolveProcessFallbackCandidates(constraints);
        }

        return candidates.Count switch
        {
            0 => TargetResolutionResult.Failure("target_not_found", "Target window was not found."),
            1 => TargetResolutionResult.Success(candidates[0]),
            _ => TargetResolutionResult.Failure(
                "ambiguous_target",
                "Target matched multiple windows. Provide windowId to disambiguate.",
                candidates.Select(Win32Provider.WindowInfoFromHandle).ToList())
        };
    }

    public static TargetResolutionResult ResolvePointWindow(HostRequest request)
    {
        var target = request.Target;
        if (!target.X.HasValue || !target.Y.HasValue)
        {
            return TargetResolutionResult.Failure("target_not_found", "No window was found at the requested point.");
        }

        var constraints = TargetConstraints.FromRequest(request);
        if (TryGetExplicitWindowHandle(request, out var explicitHandle, out var explicitFailure))
        {
            if (!Win32Provider.IsWindow(explicitHandle))
            {
                return TargetResolutionResult.Failure("target_not_found", "Target window was not found.");
            }
        }
        else if (explicitFailure is not null)
        {
            return explicitFailure;
        }

        var pointHandle = Win32Provider.WindowFromScreenPoint(target.X.Value, target.Y.Value);
        if (!Win32Provider.IsWindow(pointHandle))
        {
            return TargetResolutionResult.Failure("target_not_found", "No window was found at the requested point.");
        }

        var rootHandle = Win32Provider.GetRootWindow(pointHandle);
        if (rootHandle == IntPtr.Zero)
        {
            return TargetResolutionResult.Failure("target_not_found", "No window was found at the requested point.");
        }

        if (explicitHandle != IntPtr.Zero && explicitHandle != pointHandle && explicitHandle != rootHandle)
        {
            return TargetResolutionResult.Failure("target_not_found", "Target window was not found.");
        }

        if (!constraints.Matches(rootHandle))
        {
            return TargetResolutionResult.Failure("target_not_found", "Target window was not found.");
        }

        return TargetResolutionResult.Success(rootHandle, pointHandle);
    }

    private static bool TryGetExplicitWindowHandle(
        HostRequest request,
        out IntPtr handle,
        out TargetResolutionResult? failure)
    {
        handle = IntPtr.Zero;
        failure = null;

        if (string.IsNullOrWhiteSpace(request.Target.WindowId))
        {
            return false;
        }

        if (!long.TryParse(request.Target.WindowId, out var handleValue) || handleValue <= 0)
        {
            failure = TargetResolutionResult.Failure("target_not_found", "Target window was not found.");
            return false;
        }

        handle = new IntPtr(handleValue);
        return true;
    }

    private static List<IntPtr> ResolveProcessFallbackCandidates(TargetConstraints constraints)
    {
        var candidates = new List<IntPtr>();
        try
        {
            IEnumerable<Process> processes = constraints.ProcessName is { Length: > 0 } processName
                ? Process.GetProcessesByName(processName)
                : Process.GetProcesses();

            foreach (var process in processes)
            {
                using (process)
                {
                    if (process.MainWindowHandle == IntPtr.Zero || !Win32Provider.IsVisibleWindow(process.MainWindowHandle))
                    {
                        continue;
                    }

                    if (constraints.Matches(process.MainWindowHandle))
                    {
                        candidates.Add(process.MainWindowHandle);
                    }
                }
            }
        }
        catch
        {
            return [];
        }

        return candidates.Distinct().ToList();
    }

    private sealed class TargetConstraints
    {
        private TargetConstraints(string? processName, string? executableName, string? titleContains, string? exactPath)
        {
            ProcessName = processName;
            ExecutableName = executableName;
            TitleContains = titleContains;
            ExactPath = exactPath;
        }

        public string? ProcessName { get; }
        public string? ExecutableName { get; }
        public string? TitleContains { get; }
        public string? ExactPath { get; }
        public bool HasAnyMatcher => ProcessName is { Length: > 0 }
            || ExecutableName is { Length: > 0 }
            || TitleContains is { Length: > 0 }
            || ExactPath is { Length: > 0 };

        public static TargetConstraints FromRequest(HostRequest request)
        {
            var target = request.Target;
            var processName = NormalizeProcessName(target.ProcessName);
            var executableName = NormalizeProcessName(target.Executable);
            var titleContains = string.IsNullOrWhiteSpace(target.TitleContains)
                ? null
                : target.TitleContains.Trim();
            var exactPath = NormalizeExactPath(target.Path);

            return new TargetConstraints(processName, executableName, titleContains, exactPath);
        }

        public bool Matches(IntPtr hwnd)
        {
            if (ProcessName is { Length: > 0 }
                && !string.Equals(Win32Provider.GetProcessName(hwnd), ProcessName, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (ExecutableName is { Length: > 0 }
                && !string.Equals(Win32Provider.GetProcessName(hwnd), ExecutableName, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (TitleContains is { Length: > 0 }
                && !Win32Provider.GetWindowTitle(hwnd).Contains(TitleContains, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (ExactPath is { Length: > 0 })
            {
                var processPath = NormalizeExactPath(Win32Provider.GetProcessPath(hwnd));
                if (processPath is null || !string.Equals(processPath, ExactPath, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            return true;
        }
    }

    private static string? NormalizeProcessName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        try
        {
            var fileName = System.IO.Path.GetFileNameWithoutExtension(value.Trim());
            return string.IsNullOrWhiteSpace(fileName) ? value.Trim() : fileName;
        }
        catch
        {
            return value.Trim();
        }
    }

    private static string? NormalizeExactPath(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        try
        {
            return System.IO.Path.GetFullPath(value.Trim()).TrimEnd(
                System.IO.Path.DirectorySeparatorChar,
                System.IO.Path.AltDirectorySeparatorChar);
        }
        catch
        {
            return value.Trim();
        }
    }
}
