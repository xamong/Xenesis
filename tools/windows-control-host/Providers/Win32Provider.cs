using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using Xenesis.WindowsControlHost.Contracts;

namespace Xenesis.WindowsControlHost.Providers;

public static class Win32Provider
{
    public static HostObservationTarget TargetFromHandle(IntPtr hwnd, string? appId)
    {
        var processId = GetProcessId(hwnd);

        return new HostObservationTarget
        {
            AppId = appId,
            WindowId = FormatHandle(hwnd),
            ProcessName = GetProcessName(processId),
            Title = GetWindowTitle(hwnd),
            ClassName = GetClassName(hwnd),
            ProcessId = processId == 0 ? null : (int)processId,
            Bounds = GetBounds(hwnd)
        };
    }

    public static HostElementInfo ElementFromHandle(IntPtr hwnd)
    {
        return new HostElementInfo
        {
            ElementRef = $"win32:{FormatHandle(hwnd)}",
            Provider = "win32",
            Role = "window",
            Name = GetWindowTitle(hwnd),
            ClassName = GetClassName(hwnd),
            Bounds = GetBounds(hwnd)
        };
    }

    public static HostElementInfo? ElementFromElementRef(string elementRef)
    {
        if (!TryGetHandleFromElementRef(elementRef, out var hwnd))
        {
            return null;
        }

        return IsWindow(hwnd) ? ElementFromHandle(hwnd) : null;
    }

    public static bool TryGetHandleFromElementRef(string? elementRef, out IntPtr hwnd)
    {
        hwnd = IntPtr.Zero;
        const string prefix = "win32:";
        if (string.IsNullOrWhiteSpace(elementRef)
            || !elementRef.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            || !long.TryParse(elementRef[prefix.Length..], NumberStyles.None, CultureInfo.InvariantCulture, out var handleValue)
            || handleValue <= 0)
        {
            return false;
        }

        hwnd = new IntPtr(handleValue);
        return true;
    }

    public static bool IsSameOrDescendant(IntPtr ancestor, IntPtr candidate)
    {
        try
        {
            return IsWindow(ancestor)
                && IsWindow(candidate)
                && (ancestor == candidate || IsChild(ancestor, candidate));
        }
        catch
        {
            return false;
        }
    }

    public static List<HostElementInfo> ChildTree(IntPtr root, int depth, int limit)
    {
        var elements = new List<HostElementInfo>();
        if (root == IntPtr.Zero || depth <= 0 || limit <= 0)
        {
            return elements;
        }

        AddChildren(root, depth, limit, elements);
        return elements;
    }

    public static IntPtr WindowFromScreenPoint(int x, int y)
    {
        return WindowFromPoint(new POINT { X = x, Y = y });
    }

    public static IntPtr GetRootWindow(IntPtr hwnd)
    {
        try
        {
            if (!IsWindow(hwnd))
            {
                return IntPtr.Zero;
            }

            var root = GetAncestor(hwnd, GetAncestorFlags.GaRoot);
            return root == IntPtr.Zero ? hwnd : root;
        }
        catch
        {
            return IntPtr.Zero;
        }
    }

    public static bool IsWindow(IntPtr hwnd)
    {
        try
        {
            return hwnd != IntPtr.Zero && NativeIsWindow(hwnd);
        }
        catch
        {
            return false;
        }
    }

    public static bool IsVisibleWindow(IntPtr hwnd)
    {
        try
        {
            return IsWindow(hwnd)
                && IsWindowVisible(hwnd)
                && GetAncestor(hwnd, GetAncestorFlags.GaRoot) == hwnd
                && !string.IsNullOrWhiteSpace(GetWindowTitle(hwnd));
        }
        catch
        {
            return false;
        }
    }

    public static IEnumerable<IntPtr> EnumerateTopLevelWindows()
    {
        var windows = new List<IntPtr>();

        EnumWindows((hwnd, _) =>
        {
            if (IsVisibleWindow(hwnd))
            {
                windows.Add(hwnd);
            }

            return true;
        }, IntPtr.Zero);

        return windows;
    }

    public static string GetWindowTitle(IntPtr hwnd)
    {
        try
        {
            var length = GetWindowTextLength(hwnd);
            if (length <= 0)
            {
                return "";
            }

            var builder = new StringBuilder(length + 1);
            return GetWindowText(hwnd, builder, builder.Capacity) > 0 ? builder.ToString() : "";
        }
        catch
        {
            return "";
        }
    }

    public static string? GetProcessName(IntPtr hwnd)
    {
        var processId = GetProcessId(hwnd);
        return GetProcessName(processId);
    }

    public static string? GetProcessPath(IntPtr hwnd)
    {
        var processId = GetProcessId(hwnd);
        return GetProcessPath(processId);
    }

    public static HostWindowInfo WindowInfoFromHandle(IntPtr hwnd)
    {
        var target = TargetFromHandle(hwnd, null);
        return new HostWindowInfo
        {
            WindowId = target.WindowId ?? "",
            ProcessId = target.ProcessId,
            Title = target.Title ?? "",
            Bounds = target.Bounds
        };
    }

    private static void AddChildren(IntPtr parent, int depth, int limit, List<HostElementInfo> elements)
    {
        if (depth <= 0 || elements.Count >= limit)
        {
            return;
        }

        var child = IntPtr.Zero;
        while (elements.Count < limit)
        {
            child = FindWindowEx(parent, child, null, null);
            if (child == IntPtr.Zero)
            {
                break;
            }

            elements.Add(ElementFromHandle(child));
            AddChildren(child, depth - 1, limit, elements);
        }
    }

    private static string GetClassName(IntPtr hwnd)
    {
        try
        {
            var builder = new StringBuilder(256);
            return GetClassName(hwnd, builder, builder.Capacity) > 0 ? builder.ToString() : "";
        }
        catch
        {
            return "";
        }
    }

    private static HostBounds? GetBounds(IntPtr hwnd)
    {
        try
        {
            if (!GetWindowRect(hwnd, out var rect))
            {
                return null;
            }

            return new HostBounds
            {
                X = rect.Left,
                Y = rect.Top,
                Width = Math.Max(0, rect.Right - rect.Left),
                Height = Math.Max(0, rect.Bottom - rect.Top)
            };
        }
        catch
        {
            return null;
        }
    }

    private static uint GetProcessId(IntPtr hwnd)
    {
        try
        {
            GetWindowThreadProcessId(hwnd, out var processId);
            return processId;
        }
        catch
        {
            return 0;
        }
    }

    private static string? GetProcessName(uint processId)
    {
        if (processId == 0)
        {
            return null;
        }

        try
        {
            using var process = Process.GetProcessById((int)processId);
            return process.ProcessName;
        }
        catch
        {
            return null;
        }
    }

    private static string? GetProcessPath(uint processId)
    {
        if (processId == 0)
        {
            return null;
        }

        try
        {
            using var process = Process.GetProcessById((int)processId);
            return process.MainModule?.FileName;
        }
        catch
        {
            return null;
        }
    }

    private static string FormatHandle(IntPtr hwnd)
    {
        return hwnd.ToInt64().ToString(CultureInfo.InvariantCulture);
    }

    private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", EntryPoint = "IsWindow")]
    private static extern bool NativeIsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsChild(IntPtr hWndParent, IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern IntPtr GetAncestor(IntPtr hwnd, GetAncestorFlags flags);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr FindWindowEx(IntPtr hWndParent, IntPtr hWndChildAfter, string? lpszClass, string? lpszWindow);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr WindowFromPoint(POINT point);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }

    private enum GetAncestorFlags
    {
        GaParent = 1,
        GaRoot = 2,
        GaRootOwner = 3
    }
}
