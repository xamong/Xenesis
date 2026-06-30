using System.Globalization;
using Xenesis.WindowsControlHost.Contracts;

namespace Xenesis.WindowsControlHost.Providers;

public sealed class ElementRefResolution
{
    public bool Ok { get; init; }
    public string? Code { get; init; }
    public string? Error { get; init; }
    public HostElementInfo? Element { get; init; }

    public static ElementRefResolution Success(HostElementInfo element)
    {
        return new ElementRefResolution
        {
            Ok = true,
            Element = element
        };
    }

    public static ElementRefResolution Failure(string code, string error, HostElementInfo? element = null)
    {
        return new ElementRefResolution
        {
            Ok = false,
            Code = code,
            Error = error,
            Element = element
        };
    }
}

public static class ElementRefResolver
{
    private const int DefaultSearchDepth = 20;
    private const int DefaultSearchLimit = 1000;
    private const int MaxFallbackWindows = 32;

    public static ElementRefResolution Resolve(HostRequest request, IntPtr fallbackWindow)
    {
        var elementRef = NormalizeElementRef(request.Target.ElementRef);
        if (elementRef is null || !TryGetProvider(elementRef, out var provider))
        {
            return ElementRefResolution.Failure("element_ref_invalid", "Element reference is invalid.");
        }

        if (string.Equals(provider, "win32", StringComparison.Ordinal)
            && !IsValidWin32ElementRef(elementRef))
        {
            return ElementRefResolution.Failure("element_ref_invalid", "Element reference is invalid.");
        }

        var element = provider switch
        {
            "uia" => ResolveUia(request, fallbackWindow, elementRef),
            "msaa" => ResolveMsaa(request, fallbackWindow, elementRef),
            "win32" => Win32Provider.ElementFromElementRef(elementRef),
            _ => null
        };

        if (element is null)
        {
            return ElementRefResolution.Failure("element_ref_not_found", "Element reference was not found.");
        }

        if (!HasPositiveBounds(element.Bounds))
        {
            return ElementRefResolution.Failure(
                "element_ref_bounds_unavailable",
                "Element reference bounds are unavailable.",
                element);
        }

        return ElementRefResolution.Success(element);
    }

    private static HostElementInfo? ResolveUia(HostRequest request, IntPtr fallbackWindow, string elementRef)
    {
        var hwnd = ResolveSearchWindow(request, fallbackWindow);
        var depth = NormalizeDepth(request.Options.Depth);
        var limit = NormalizeLimit(request.Options.Limit);
        var includeValues = request.Options.IncludeValues != false;
        if (hwnd != IntPtr.Zero)
        {
            return UiaProvider.FindByElementRef(hwnd, elementRef, depth, limit, includeValues);
        }

        foreach (var window in Win32Provider.EnumerateTopLevelWindows().Take(MaxFallbackWindows))
        {
            try
            {
                var match = UiaProvider.FindByElementRef(window, elementRef, depth, limit, includeValues);
                if (match is not null)
                {
                    return match;
                }
            }
            catch
            {
                // Keep searching if a top-level window rejects UIA access or disappears.
            }
        }

        return null;
    }

    private static HostElementInfo? ResolveMsaa(HostRequest request, IntPtr fallbackWindow, string elementRef)
    {
        var hwnd = ResolveSearchWindow(request, fallbackWindow);
        var limit = NormalizeLimit(request.Options.Limit);
        if (hwnd != IntPtr.Zero)
        {
            return MsaaProvider.FindByElementRef(hwnd, elementRef, limit);
        }

        foreach (var window in Win32Provider.EnumerateTopLevelWindows().Take(MaxFallbackWindows))
        {
            try
            {
                var match = MsaaProvider.FindByElementRef(window, elementRef, limit);
                if (match is not null)
                {
                    return match;
                }
            }
            catch
            {
                // Keep searching if a top-level window rejects MSAA access or disappears.
            }
        }

        return null;
    }

    private static IntPtr ResolveSearchWindow(HostRequest request, IntPtr fallbackWindow)
    {
        if (Win32Provider.IsWindow(fallbackWindow))
        {
            return fallbackWindow;
        }

        var resolution = TargetResolver.ResolveWindow(request);
        return resolution.Resolved ? resolution.Handle : IntPtr.Zero;
    }

    private static string? NormalizeElementRef(string? elementRef)
    {
        if (string.IsNullOrWhiteSpace(elementRef))
        {
            return null;
        }

        elementRef = elementRef.Trim();
        var separator = elementRef.IndexOf(':', StringComparison.Ordinal);
        if (separator <= 0 || separator == elementRef.Length - 1)
        {
            return null;
        }

        return string.Concat(
            elementRef[..separator].ToLowerInvariant(),
            elementRef[separator..]);
    }

    private static bool TryGetProvider(string elementRef, out string provider)
    {
        provider = "";
        var separator = elementRef.IndexOf(':', StringComparison.Ordinal);
        if (separator <= 0 || separator == elementRef.Length - 1)
        {
            return false;
        }

        provider = elementRef[..separator];
        return provider is "uia" or "msaa" or "win32";
    }

    private static bool IsValidWin32ElementRef(string elementRef)
    {
        const string prefix = "win32:";
        return elementRef.StartsWith(prefix, StringComparison.Ordinal)
            && long.TryParse(elementRef[prefix.Length..], NumberStyles.None, CultureInfo.InvariantCulture, out var handleValue)
            && handleValue > 0;
    }

    private static int NormalizeDepth(int? depth)
    {
        return Math.Clamp(depth ?? DefaultSearchDepth, 1, DefaultSearchDepth);
    }

    private static int NormalizeLimit(int? limit)
    {
        return Math.Clamp(limit ?? DefaultSearchLimit, 1, DefaultSearchLimit);
    }

    private static bool HasPositiveBounds(HostBounds? bounds)
    {
        return bounds is not null && bounds.Width > 0 && bounds.Height > 0;
    }
}
