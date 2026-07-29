using System.Diagnostics;
using System.Drawing;
using System.Runtime.CompilerServices;
using System.Windows.Forms;

namespace SignFlow.NativeHelper;

internal static class TrayIconBootstrap
{
    private const string StatusUrl = "http://127.0.0.1:17891/v1/status";

    [ModuleInitializer]
    internal static void Initialize()
    {
        if (!OperatingSystem.IsWindows()) return;

        var thread = new Thread(RunTray)
        {
            IsBackground = true,
            Name = "SignFlow Native Helper tray"
        };
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
    }

    private static void RunTray()
    {
        ApplicationConfiguration.Initialize();

        using var menu = new ContextMenuStrip();
        menu.Items.Add("Открыть состояние", null, (_, _) => OpenUrl(StatusUrl));
        menu.Items.Add("Открыть SignFlow", null, (_, _) => OpenUrl("https://vanitoo.github.io/signflow-preview/"));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Выход", null, (_, _) =>
        {
            Application.ExitThread();
            Environment.Exit(0);
        });

        using var notifyIcon = new NotifyIcon
        {
            Icon = SystemIcons.Shield,
            Text = "SignFlow Native Helper",
            ContextMenuStrip = menu,
            Visible = true
        };

        notifyIcon.DoubleClick += (_, _) => OpenUrl(StatusUrl);
        notifyIcon.ShowBalloonTip(
            2500,
            "SignFlow Native Helper",
            "Локальное приложение запущено и готово принимать запросы SignFlow.",
            ToolTipIcon.Info);

        Application.Run();
        notifyIcon.Visible = false;
    }

    private static void OpenUrl(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch
        {
            // Tray commands must never stop the local API.
        }
    }
}
