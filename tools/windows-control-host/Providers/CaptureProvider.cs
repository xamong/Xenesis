using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using Xenesis.WindowsControlHost.Contracts;

namespace Xenesis.WindowsControlHost.Providers;

public static class CaptureProvider
{
    public static string CaptureBounds(HostBounds bounds, string? requestedPath)
    {
        string path = string.IsNullOrWhiteSpace(requestedPath)
            ? Path.Combine(Path.GetTempPath(), $"xenesis-app-{DateTimeOffset.UtcNow:yyyyMMddHHmmssfff}.png")
            : Path.GetFullPath(requestedPath.Trim());

        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var width = Math.Max(1, bounds.Width);
        var height = Math.Max(1, bounds.Height);

        using var bitmap = new Bitmap(width, height);
        using (var graphics = Graphics.FromImage(bitmap))
        {
            graphics.CopyFromScreen(bounds.X, bounds.Y, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy);
        }

        bitmap.Save(path, ImageFormat.Png);
        return path;
    }
}
