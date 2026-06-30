using System.Globalization;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Accessibility;
using Xenesis.WindowsControlHost.Contracts;

namespace Xenesis.WindowsControlHost.Providers;

public static class MsaaProvider
{
    private const int MaxValueLength = 500;
    private const int DefaultSearchLimit = 1000;
    private const uint ObjIdClient = 0xFFFFFFFC;
    private const uint ObjIdWindow = 0x00000000;

    public static HostElementInfo? FromWindow(IntPtr hwnd)
    {
        try
        {
            if (hwnd == IntPtr.Zero)
            {
                return null;
            }

            if (TryAccessibleObjectFromWindow(hwnd, ObjIdClient, out var accessible)
                || TryAccessibleObjectFromWindow(hwnd, ObjIdWindow, out accessible))
            {
                return accessible is null ? null : ToHostElementInfo(accessible, 0);
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    public static HostElementInfo? FromPoint(int x, int y)
    {
        try
        {
            var point = new POINT { X = x, Y = y };
            var result = AccessibleObjectFromPoint(point, out var accessible, out var child);
            if (result < 0 || accessible is null)
            {
                return null;
            }

            return ToHostElementInfo(accessible, NormalizeChildId(child));
        }
        catch
        {
            return null;
        }
    }

    public static HostElementInfo? FindByElementRef(IntPtr hwnd, string elementRef, int limit = DefaultSearchLimit)
    {
        if (hwnd == IntPtr.Zero || string.IsNullOrWhiteSpace(elementRef))
        {
            return null;
        }

        limit = Math.Clamp(limit, 1, DefaultSearchLimit);
        foreach (var root in AccessibleRootsFromWindow(hwnd))
        {
            try
            {
                var visited = 0;
                var match = FindByElementRef(root, elementRef, limit, ref visited);
                if (match is not null)
                {
                    return match;
                }
            }
            catch
            {
                // Keep searching alternate roots if one MSAA object becomes unavailable.
            }
        }

        return null;
    }

    private static IEnumerable<IAccessible> AccessibleRootsFromWindow(IntPtr hwnd)
    {
        if (TryAccessibleObjectFromWindow(hwnd, ObjIdClient, out var clientAccessible) && clientAccessible is not null)
        {
            yield return clientAccessible;
        }

        if (TryAccessibleObjectFromWindow(hwnd, ObjIdWindow, out var windowAccessible) && windowAccessible is not null)
        {
            yield return windowAccessible;
        }
    }

    private static HostElementInfo? FindByElementRef(
        IAccessible accessible,
        string elementRef,
        int limit,
        ref int visited)
    {
        if (visited >= limit)
        {
            return null;
        }

        var rootInfo = ToHostElementInfo(accessible, 0);
        visited++;
        if (string.Equals(rootInfo.ElementRef, elementRef, StringComparison.Ordinal))
        {
            return rootInfo;
        }

        return FindChildByElementRef(accessible, elementRef, limit, ref visited);
    }

    private static HostElementInfo? FindChildByElementRef(
        IAccessible parent,
        string elementRef,
        int limit,
        ref int visited)
    {
        var childCount = GetChildCount(parent) ?? 0;
        for (var start = 0; start < childCount && visited < limit;)
        {
            object[] children;
            int obtained;
            try
            {
                var requested = Math.Min(childCount - start, limit - visited);
                children = new object[requested];
                var result = AccessibleChildren(parent, start, requested, children, out obtained);
                if (result < 0 || obtained <= 0)
                {
                    break;
                }
            }
            catch
            {
                break;
            }

            start += obtained;
            for (var index = 0; index < obtained && visited < limit; index++)
            {
                try
                {
                    var child = children[index];
                    if (TryNormalizeInt(child, out var childId))
                    {
                        var info = ToHostElementInfo(parent, childId);
                        visited++;
                        if (string.Equals(info.ElementRef, elementRef, StringComparison.Ordinal))
                        {
                            return info;
                        }

                        continue;
                    }

                    if (child is not IAccessible childAccessible)
                    {
                        continue;
                    }

                    var match = FindByElementRef(childAccessible, elementRef, limit, ref visited);
                    if (match is not null)
                    {
                        return match;
                    }
                }
                catch
                {
                    // Keep walking siblings if one child rejects COM access or disappears.
                }
            }
        }

        return null;
    }

    private static HostElementInfo ToHostElementInfo(IAccessible accessible, int childId)
    {
        var name = GetName(accessible, childId);
        var role = GetRole(accessible, childId);
        var bounds = GetBounds(accessible, childId);
        var childCount = GetChildCount(accessible);
        var protectedState = HasProtectedState(accessible, childId);

        return new HostElementInfo
        {
            ElementRef = $"msaa:{GetElementRef(name, role, bounds, childCount, childId)}",
            Provider = "msaa",
            Name = name,
            Role = role,
            Value = GetValue(accessible, childId, name, role, protectedState),
            State = GetState(accessible, childId),
            Bounds = bounds,
            ChildCount = childCount
        };
    }

    private static string GetElementRef(
        string? name,
        string? role,
        HostBounds? bounds,
        int? childCount,
        int childId)
    {
        var raw = string.Join(
            "|",
            new[]
            {
                name,
                role,
                bounds is null ? null : $"{bounds.X},{bounds.Y},{bounds.Width},{bounds.Height}",
                childCount?.ToString(CultureInfo.InvariantCulture),
                childId.ToString(CultureInfo.InvariantCulture)
            }.Where(value => !string.IsNullOrWhiteSpace(value)));

        return $"{StableHash(raw)}:{childId.ToString(CultureInfo.InvariantCulture)}";
    }

    private static string StableHash(string value)
    {
        const ulong offsetBasis = 14695981039346656037;
        const ulong prime = 1099511628211;

        var hash = offsetBasis;
        foreach (var character in value)
        {
            hash ^= character;
            hash *= prime;
        }

        return hash.ToString("x16", CultureInfo.InvariantCulture);
    }

    private static string? GetName(IAccessible accessible, int childId)
    {
        try
        {
            return accessible.get_accName(childId);
        }
        catch
        {
            return null;
        }
    }

    private static string? GetRole(IAccessible accessible, int childId)
    {
        try
        {
            var role = accessible.get_accRole(childId);
            return role switch
            {
                null => null,
                int roleId => Enum.IsDefined(typeof(AccessibleRole), roleId)
                    ? ((AccessibleRole)roleId).ToString()
                    : roleId.ToString(CultureInfo.InvariantCulture),
                _ => role.ToString()
            };
        }
        catch
        {
            return null;
        }
    }

    private static string? GetValue(
        IAccessible accessible,
        int childId,
        string? name,
        string? role,
        bool protectedState)
    {
        if (protectedState || HasSensitiveHint(name) || HasSensitiveHint(role))
        {
            return "[masked]";
        }

        return Truncate(GetRawValue(accessible, childId));
    }

    private static string? GetRawValue(IAccessible accessible, int childId)
    {
        try
        {
            return accessible.get_accValue(childId);
        }
        catch
        {
            return null;
        }
    }

    private static bool HasProtectedState(IAccessible accessible, int childId)
    {
        try
        {
            var rawState = accessible.get_accState(childId);
            return TryNormalizeInt(rawState, out var stateId)
                && ((AccessibleStates)stateId).HasFlag(AccessibleStates.Protected);
        }
        catch
        {
            return false;
        }
    }

    private static bool HasSensitiveHint(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return value.Contains("password", StringComparison.OrdinalIgnoreCase)
            || value.Contains("passcode", StringComparison.OrdinalIgnoreCase)
            || value.Contains("secret", StringComparison.OrdinalIgnoreCase)
            || value.Contains("credential", StringComparison.OrdinalIgnoreCase);
    }

    private static List<string>? GetState(IAccessible accessible, int childId)
    {
        try
        {
            var rawState = accessible.get_accState(childId);
            if (rawState is null)
            {
                return null;
            }

            var state = TryNormalizeInt(rawState, out var stateId)
                ? ExpandStateFlags(stateId)
                : new List<string> { rawState.ToString() ?? "" }
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .ToList();
            return state.Count == 0 ? null : state;
        }
        catch
        {
            return null;
        }
    }

    private static List<string> ExpandStateFlags(int stateId)
    {
        var state = new List<string>();
        foreach (AccessibleStates value in Enum.GetValues<AccessibleStates>())
        {
            if (value == AccessibleStates.None)
            {
                continue;
            }

            if (((AccessibleStates)stateId).HasFlag(value))
            {
                state.Add(value.ToString());
            }
        }

        return state;
    }

    private static HostBounds? GetBounds(IAccessible accessible, int childId)
    {
        try
        {
            accessible.accLocation(out var left, out var top, out var width, out var height, childId);
            return new HostBounds
            {
                X = left,
                Y = top,
                Width = Math.Max(0, width),
                Height = Math.Max(0, height)
            };
        }
        catch
        {
            return null;
        }
    }

    private static int? GetChildCount(IAccessible accessible)
    {
        try
        {
            return accessible.accChildCount;
        }
        catch
        {
            return null;
        }
    }

    private static int NormalizeChildId(object child)
    {
        return TryNormalizeInt(child, out var childId) ? childId : 0;
    }

    private static bool TryNormalizeInt(object? value, out int result)
    {
        result = 0;
        try
        {
            result = value switch
            {
                null => 0,
                int intValue => intValue,
                short shortValue => shortValue,
                long longValue => checked((int)longValue),
                _ => Convert.ToInt32(value, CultureInfo.InvariantCulture)
            };
            return value is not null;
        }
        catch
        {
            result = 0;
            return false;
        }
    }

    private static string? Truncate(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= MaxValueLength ? value : value[..MaxValueLength];
    }

    private static bool TryAccessibleObjectFromWindow(IntPtr hwnd, uint objectId, out IAccessible? accessible)
    {
        try
        {
            var iidIAccessible = new Guid("618736E0-3C3D-11CF-810C-00AA00389B71");
            var result = AccessibleObjectFromWindow(hwnd, objectId, ref iidIAccessible, out accessible);
            return result >= 0 && accessible is not null;
        }
        catch
        {
            accessible = null;
            return false;
        }
    }

    [DllImport("oleacc.dll", PreserveSig = true)]
    private static extern int AccessibleObjectFromWindow(
        IntPtr hwnd,
        uint dwObjectId,
        ref Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out IAccessible? ppvObject);

    [DllImport("oleacc.dll", PreserveSig = true)]
    private static extern int AccessibleObjectFromPoint(
        POINT ptScreen,
        [MarshalAs(UnmanagedType.Interface)] out IAccessible? ppacc,
        [MarshalAs(UnmanagedType.Struct)] out object pvarChild);

    [DllImport("oleacc.dll", PreserveSig = true)]
    private static extern int AccessibleChildren(
        [MarshalAs(UnmanagedType.Interface)] IAccessible paccContainer,
        int iChildStart,
        int cChildren,
        [Out, MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 2)] object[] rgvarChildren,
        out int pcObtained);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }
}
