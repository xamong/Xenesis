using System.Drawing;
using System.Threading;
using System.Windows.Forms;
using Xenesis.WindowsControlHost.Contracts;

namespace Xenesis.WindowsControlHost.Providers;

public static class HighlightProvider
{
    private const int MinDurationMs = 100;
    private const int MaxDurationMs = 10000;

    public static void Show(HostBounds bounds, int durationMs)
    {
        var clampedDuration = Math.Clamp(durationMs, MinDurationMs, MaxDurationMs);
        var normalizedBounds = new Rectangle(
            bounds.X,
            bounds.Y,
            Math.Max(1, bounds.Width),
            Math.Max(1, bounds.Height));

        if (Thread.CurrentThread.GetApartmentState() == ApartmentState.STA)
        {
            RunHighlightLoop(normalizedBounds, clampedDuration);
            return;
        }

        Exception? exception = null;
        var thread = new Thread(() =>
        {
            try
            {
                RunHighlightLoop(normalizedBounds, clampedDuration);
            }
            catch (Exception ex)
            {
                exception = ex;
            }
        });

        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join();

        if (exception is not null)
        {
            throw exception;
        }
    }

    private static void RunHighlightLoop(Rectangle bounds, int durationMs)
    {
        using var form = new HighlightForm(bounds);
        using var timer = new System.Windows.Forms.Timer { Interval = durationMs };

        timer.Tick += (_, _) =>
        {
            timer.Stop();
            form.Close();
        };
        form.Shown += (_, _) => timer.Start();

        Application.Run(form);
    }

    private sealed class HighlightForm : Form
    {
        private const int BorderWidth = 4;

        public HighlightForm(Rectangle bounds)
        {
            BackColor = Color.Magenta;
            Bounds = bounds;
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            TopMost = true;
            TransparencyKey = Color.Magenta;
        }

        protected override bool ShowWithoutActivation => true;

        protected override CreateParams CreateParams
        {
            get
            {
                const int wsExToolWindow = 0x00000080;
                const int wsExNoActivate = 0x08000000;

                var createParams = base.CreateParams;
                createParams.ExStyle |= wsExToolWindow | wsExNoActivate;
                return createParams;
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            using var pen = new Pen(Color.DeepSkyBlue, BorderWidth);
            var inset = BorderWidth / 2;
            e.Graphics.DrawRectangle(
                pen,
                inset,
                inset,
                Math.Max(0, ClientSize.Width - BorderWidth),
                Math.Max(0, ClientSize.Height - BorderWidth));
        }
    }
}
