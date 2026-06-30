using System.Globalization;
using System.Windows.Automation;
using WindowsPoint = System.Windows.Point;
using WindowsRect = System.Windows.Rect;
using Xenesis.WindowsControlHost.Contracts;

namespace Xenesis.WindowsControlHost.Providers;

public static class UiaProvider
{
    private const int MaxValueLength = 500;

    public static HostElementInfo? FromWindow(IntPtr hwnd)
    {
        try
        {
            if (hwnd == IntPtr.Zero)
            {
                return null;
            }

            var element = AutomationElement.FromHandle(hwnd);
            return element is null ? null : ToHostElementInfo(element, includeValues: true);
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
            var element = AutomationElement.FromPoint(new WindowsPoint(x, y));
            return element is null ? null : ToHostElementInfo(element, includeValues: true);
        }
        catch
        {
            return null;
        }
    }

    public static List<HostElementInfo> TreeFromWindow(IntPtr hwnd, int depth, int limit, bool includeValues)
    {
        var elements = new List<HostElementInfo>();
        if (hwnd == IntPtr.Zero || depth <= 0 || limit <= 0)
        {
            return elements;
        }

        var root = AutomationElement.FromHandle(hwnd);
        if (root is null)
        {
            return elements;
        }

        AddChildren(root, depth, limit, includeValues, elements);
        return elements;
    }

    public static HostElementInfo? FindByElementRef(
        IntPtr hwnd,
        string elementRef,
        int depth,
        int limit,
        bool includeValues)
    {
        try
        {
            if (hwnd == IntPtr.Zero || string.IsNullOrWhiteSpace(elementRef))
            {
                return null;
            }

            depth = Math.Clamp(depth, 1, 20);
            limit = Math.Clamp(limit, 1, 1000);

            var root = AutomationElement.FromHandle(hwnd);
            if (root is null)
            {
                return null;
            }

            var visited = 0;
            var rootInfo = ToHostElementInfo(root, includeValues);
            visited++;
            if (string.Equals(rootInfo.ElementRef, elementRef, StringComparison.Ordinal))
            {
                return rootInfo;
            }

            return FindChildByElementRef(root, elementRef, depth, limit, includeValues, ref visited);
        }
        catch
        {
            return null;
        }
    }

    private static void AddChildren(
        AutomationElement parent,
        int depth,
        int limit,
        bool includeValues,
        List<HostElementInfo> elements)
    {
        if (depth <= 0 || elements.Count >= limit)
        {
            return;
        }

        AutomationElementCollection children;
        try
        {
            children = parent.FindAll(TreeScope.Children, System.Windows.Automation.Condition.TrueCondition);
        }
        catch
        {
            return;
        }

        foreach (AutomationElement child in children)
        {
            if (elements.Count >= limit)
            {
                return;
            }

            try
            {
                elements.Add(ToHostElementInfo(child, includeValues));
                AddChildren(child, depth - 1, limit, includeValues, elements);
            }
            catch
            {
                // Keep walking siblings if one UIA element becomes unavailable.
            }
        }
    }

    private static HostElementInfo? FindChildByElementRef(
        AutomationElement parent,
        string elementRef,
        int depth,
        int limit,
        bool includeValues,
        ref int visited)
    {
        if (depth <= 0 || visited >= limit)
        {
            return null;
        }

        AutomationElementCollection children;
        try
        {
            children = parent.FindAll(TreeScope.Children, System.Windows.Automation.Condition.TrueCondition);
        }
        catch
        {
            return null;
        }

        foreach (AutomationElement child in children)
        {
            if (visited >= limit)
            {
                return null;
            }

            try
            {
                var info = ToHostElementInfo(child, includeValues);
                visited++;
                if (string.Equals(info.ElementRef, elementRef, StringComparison.Ordinal))
                {
                    return info;
                }

                var match = FindChildByElementRef(child, elementRef, depth - 1, limit, includeValues, ref visited);
                if (match is not null)
                {
                    return match;
                }
            }
            catch
            {
                // Keep walking siblings if one UIA element becomes unavailable.
            }
        }

        return null;
    }

    private static HostElementInfo ToHostElementInfo(AutomationElement element, bool includeValues)
    {
        var role = GetControlTypeName(element);

        return new HostElementInfo
        {
            ElementRef = $"uia:{GetElementRef(element)}",
            Provider = "uia",
            Name = GetStringProperty(element, AutomationElement.NameProperty),
            Role = role,
            Value = includeValues ? GetValue(element, role) : null,
            AutomationId = GetStringProperty(element, AutomationElement.AutomationIdProperty),
            ClassName = GetStringProperty(element, AutomationElement.ClassNameProperty),
            State = GetState(element),
            Bounds = GetBounds(element)
        };
    }

    private static string GetElementRef(AutomationElement element)
    {
        try
        {
            var runtimeId = element.GetRuntimeId();
            if (runtimeId is { Length: > 0 })
            {
                return string.Join(".", runtimeId.Select(id => id.ToString(CultureInfo.InvariantCulture)));
            }
        }
        catch
        {
        }

        var automationId = GetStringProperty(element, AutomationElement.AutomationIdProperty);
        var className = GetStringProperty(element, AutomationElement.ClassNameProperty);
        var name = GetStringProperty(element, AutomationElement.NameProperty);
        var bounds = GetBounds(element);
        var raw = string.Join(
            "|",
            new[]
            {
                automationId,
                className,
                name,
                bounds is null ? null : $"{bounds.X},{bounds.Y},{bounds.Width},{bounds.Height}"
            }.Where(value => !string.IsNullOrWhiteSpace(value)));

        return StableHash(raw);
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

    private static string? GetControlTypeName(AutomationElement element)
    {
        try
        {
            if (element.GetCurrentPropertyValue(AutomationElement.ControlTypeProperty) is ControlType controlType)
            {
                return controlType.ProgrammaticName.Replace("ControlType.", "", StringComparison.Ordinal);
            }
        }
        catch
        {
        }

        return null;
    }

    private static string? GetValue(AutomationElement element, string? role)
    {
        if (IsPasswordLike(element, role))
        {
            return "[masked]";
        }

        try
        {
            if (element.TryGetCurrentPattern(ValuePattern.Pattern, out var pattern)
                && pattern is ValuePattern valuePattern)
            {
                return Truncate(valuePattern.Current.Value);
            }
        }
        catch
        {
        }

        return null;
    }

    private static bool IsPasswordLike(AutomationElement element, string? role)
    {
        try
        {
            if (element.GetCurrentPropertyValue(AutomationElement.IsPasswordProperty) is bool isPassword && isPassword)
            {
                return true;
            }
        }
        catch
        {
        }

        return string.Equals(role, "PasswordBox", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role, "PasswordEdit", StringComparison.OrdinalIgnoreCase);
    }

    private static List<string>? GetState(AutomationElement element)
    {
        var state = new List<string>();
        AddStateFlag(element, AutomationElement.IsEnabledProperty, "enabled", state);
        AddStateFlag(element, AutomationElement.IsKeyboardFocusableProperty, "focusable", state);
        AddStateFlag(element, AutomationElement.HasKeyboardFocusProperty, "focused", state);
        AddStateFlag(element, AutomationElement.IsOffscreenProperty, "offscreen", state);
        return state.Count == 0 ? null : state;
    }

    private static void AddStateFlag(
        AutomationElement element,
        AutomationProperty property,
        string name,
        List<string> state)
    {
        try
        {
            if (element.GetCurrentPropertyValue(property) is bool value && value)
            {
                state.Add(name);
            }
        }
        catch
        {
        }
    }

    private static string? GetStringProperty(AutomationElement element, AutomationProperty property)
    {
        try
        {
            return element.GetCurrentPropertyValue(property) as string;
        }
        catch
        {
            return null;
        }
    }

    private static HostBounds? GetBounds(AutomationElement element)
    {
        try
        {
            if (element.GetCurrentPropertyValue(AutomationElement.BoundingRectangleProperty) is WindowsRect rect
                && !rect.IsEmpty)
            {
                return new HostBounds
                {
                    X = (int)Math.Round(rect.X),
                    Y = (int)Math.Round(rect.Y),
                    Width = Math.Max(0, (int)Math.Round(rect.Width)),
                    Height = Math.Max(0, (int)Math.Round(rect.Height))
                };
            }
        }
        catch
        {
        }

        return null;
    }

    private static string? Truncate(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= MaxValueLength ? value : value[..MaxValueLength];
    }
}
