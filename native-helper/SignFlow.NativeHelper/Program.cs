using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;

const string ServiceName = "SignFlow Native Helper";
const string Version = "0.1.0-preview.1";
const long MaxUploadBytes = 2L * 1024 * 1024 * 1024;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:17891");
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = MaxUploadBytes);

var allowedOrigins = new[]
{
    "https://vanitoo.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
};

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(allowedOrigins)
    .WithMethods("GET", "POST", "OPTIONS")
    .AllowAnyHeader()));

builder.Services.AddSingleton<ToolLocator>();
builder.Services.AddSingleton<PdfAService>();
builder.Services.AddSingleton<CounterSignatureService>();

var app = builder.Build();
app.UseCors();
app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Cross-Origin-Resource-Policy"] = "cross-origin";
    await next();
});

app.MapGet("/v1/status", (ToolLocator tools) =>
{
    var ghostscript = tools.FindGhostscript();
    var veraPdf = tools.FindVeraPdf();
    var bridge = tools.FindCryptoProBridge();
    var capabilities = new List<string>();
    if (ghostscript is not null) capabilities.Add("pdfa-conversion");
    if (veraPdf is not null) capabilities.Add("pdfa-validation");
    if (bridge is not null) capabilities.Add("cades-counter-signature");

    return Results.Ok(new
    {
        service = ServiceName,
        version = Version,
        capabilities,
        platform = Environment.OSVersion.VersionString,
        tools = new
        {
            ghostscript = ghostscript is not null,
            veraPdf = veraPdf is not null,
            cryptoProBridge = bridge is not null
        }
    });
});

app.MapPost("/v1/pdf/validate-pdfa", async (HttpRequest request, PdfAService service, CancellationToken ct) =>
{
    if (!request.HasFormContentType) return Results.BadRequest("Ожидается multipart/form-data.");
    var form = await request.ReadFormAsync(ct);
    var file = form.Files.GetFile("file");
    if (file is null) return Results.BadRequest("Не передан PDF в поле file.");
    if (!LooksLikePdf(file.FileName, file.ContentType)) return Results.BadRequest("Поддерживаются только PDF-файлы.");

    await using var workspace = await TempWorkspace.CreateAsync(file, ct);
    var result = await service.ValidateAsync(workspace.InputPath, form["profile"].FirstOrDefault() ?? "2b", ct);
    return Results.Ok(result);
});

app.MapPost("/v1/pdf/convert-to-pdfa", async (HttpRequest request, PdfAService service, CancellationToken ct) =>
{
    if (!request.HasFormContentType) return Results.BadRequest("Ожидается multipart/form-data.");
    var form = await request.ReadFormAsync(ct);
    var file = form.Files.GetFile("file");
    if (file is null) return Results.BadRequest("Не передан PDF в поле file.");
    if (!LooksLikePdf(file.FileName, file.ContentType)) return Results.BadRequest("Поддерживаются только PDF-файлы.");

    await using var workspace = await TempWorkspace.CreateAsync(file, ct);
    var result = await service.ConvertAsync(workspace.InputPath, workspace.OutputPath, ct);
    if (!result.Success) return Results.Problem(result.Error, statusCode: 422, title: "Не удалось создать PDF/A-2b");

    var bytes = await File.ReadAllBytesAsync(workspace.OutputPath, ct);
    var outputName = Path.GetFileNameWithoutExtension(file.FileName) + "_PDFA.pdf";
    return Results.File(bytes, "application/pdf", outputName);
});

app.MapPost("/v1/cades/counter-sign", async (HttpRequest request, CounterSignatureService service, CancellationToken ct) =>
{
    if (!request.HasFormContentType) return Results.BadRequest("Ожидается multipart/form-data.");
    var form = await request.ReadFormAsync(ct);
    var signature = form.Files.GetFile("signature");
    if (signature is null) return Results.BadRequest("Не передан файл подписи в поле signature.");

    var thumbprint = NormalizeThumbprint(form["certificateThumbprint"].FirstOrDefault());
    if (thumbprint.Length < 20) return Results.BadRequest("Некорректный отпечаток сертификата.");
    if (!int.TryParse(form["signerIndex"].FirstOrDefault(), out var signerIndex) || signerIndex < 0)
        return Results.BadRequest("Некорректный индекс подписанта.");

    await using var workspace = await TempWorkspace.CreateAsync(signature, ct);
    var result = await service.CounterSignAsync(workspace.InputPath, workspace.OutputPath, thumbprint, signerIndex, ct);
    if (!result.Success) return Results.Problem(result.Error, statusCode: result.StatusCode, title: "Контрподпись не создана");

    var bytes = await File.ReadAllBytesAsync(workspace.OutputPath, ct);
    return Results.File(bytes, "application/pkcs7-signature", signature.FileName);
});

app.MapGet("/", () => Results.Text($"{ServiceName} {Version}\nLocal API: http://127.0.0.1:17891/v1/status", "text/plain; charset=utf-8"));
app.Run();

static bool LooksLikePdf(string fileName, string? contentType) =>
    fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(contentType, "application/pdf", StringComparison.OrdinalIgnoreCase);

static string NormalizeThumbprint(string? value) => Regex.Replace(value ?? string.Empty, "[^0-9A-Fa-f]", string.Empty).ToUpperInvariant();

sealed class ToolLocator
{
    private readonly string _baseDirectory = AppContext.BaseDirectory;

    public string? FindGhostscript() => FirstExisting(
        Environment.GetEnvironmentVariable("SIGNFLOW_GHOSTSCRIPT"),
        Path.Combine(_baseDirectory, "tools", "ghostscript", "bin", "gswin64c.exe"),
        FindNewest(@"C:\Program Files\gs", "gswin64c.exe"));

    public string? FindVeraPdf() => FirstExisting(
        Environment.GetEnvironmentVariable("SIGNFLOW_VERAPDF"),
        Path.Combine(_baseDirectory, "tools", "verapdf", "verapdf.bat"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "veraPDF", "verapdf.bat"));

    public string? FindCryptoProBridge() => FirstExisting(
        Environment.GetEnvironmentVariable("SIGNFLOW_CRYPTOPRO_BRIDGE"),
        Path.Combine(_baseDirectory, "SignFlow.CryptoProBridge.exe"),
        Path.Combine(_baseDirectory, "tools", "cryptopro", "SignFlow.CryptoProBridge.exe"));

    public string? FindIccProfile() => FirstExisting(
        Environment.GetEnvironmentVariable("SIGNFLOW_ICC_PROFILE"),
        Path.Combine(_baseDirectory, "assets", "sRGB.icc"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "spool", "drivers", "color", "sRGB Color Space Profile.icm"));

    private static string? FirstExisting(params string?[] candidates) => candidates.FirstOrDefault(path => !string.IsNullOrWhiteSpace(path) && File.Exists(path));

    private static string? FindNewest(string root, string fileName)
    {
        if (!Directory.Exists(root)) return null;
        return Directory.EnumerateFiles(root, fileName, SearchOption.AllDirectories)
            .OrderByDescending(File.GetLastWriteTimeUtc)
            .FirstOrDefault();
    }
}

sealed class PdfAService(ToolLocator tools)
{
    public async Task<object> ValidateAsync(string inputPath, string profile, CancellationToken ct)
    {
        var veraPdf = tools.FindVeraPdf();
        if (veraPdf is null) return new { compliant = false, profile, available = false, error = "veraPDF не найден." };
        var normalizedProfile = profile is "1b" or "2b" or "3b" ? profile : "2b";
        var run = await ProcessRunner.RunAsync(veraPdf, $"--format json --flavour {normalizedProfile} \"{inputPath}\"", ct);
        var compliant = run.ExitCode == 0 && (run.StdOut.Contains("\"isCompliant\":true", StringComparison.OrdinalIgnoreCase) || run.StdOut.Contains("\"compliant\":true", StringComparison.OrdinalIgnoreCase));
        return new { compliant, profile = normalizedProfile, available = true, exitCode = run.ExitCode, report = TryParseJson(run.StdOut), error = compliant ? null : Trim(run.StdErr + "\n" + run.StdOut) };
    }

    public async Task<OperationResult> ConvertAsync(string inputPath, string outputPath, CancellationToken ct)
    {
        var ghostscript = tools.FindGhostscript();
        var iccProfile = tools.FindIccProfile();
        if (ghostscript is null) return OperationResult.Fail("Ghostscript не найден. Установите Ghostscript x64 или задайте SIGNFLOW_GHOSTSCRIPT.", 503);
        if (iccProfile is null) return OperationResult.Fail("Не найден sRGB ICC-профиль. Укажите SIGNFLOW_ICC_PROFILE.", 503);

        var definitionPath = Path.Combine(Path.GetDirectoryName(outputPath)!, "PDFA_def.ps");
        var escapedIcc = iccProfile.Replace("\\", "/").Replace("(", "\\(").Replace(")", "\\)");
        await File.WriteAllTextAsync(definitionPath, PdfADefinition(escapedIcc), ct);

        var args = string.Join(' ', new[]
        {
            "-dBATCH", "-dNOPAUSE", "-dSAFER", "-dPDFA=2", "-dPDFACompatibilityPolicy=1",
            "-sDEVICE=pdfwrite", "-sColorConversionStrategy=RGB", "-sProcessColorModel=DeviceRGB",
            "-dEmbedAllFonts=true", "-dSubsetFonts=true", "-dDetectDuplicateImages=true",
            $"-sOutputFile=\"{outputPath}\"", $"\"{definitionPath}\"", $"\"{inputPath}\""
        });
        var run = await ProcessRunner.RunAsync(ghostscript, args, ct);
        if (run.ExitCode != 0 || !File.Exists(outputPath)) return OperationResult.Fail(Trim(run.StdErr + "\n" + run.StdOut), 422);

        var validation = await ValidateAsync(outputPath, "2b", ct);
        var json = JsonSerializer.Serialize(validation);
        if (!json.Contains("\"compliant\":true", StringComparison.OrdinalIgnoreCase))
            return OperationResult.Fail("Ghostscript создал PDF, но veraPDF не подтвердил PDF/A-2b: " + Trim(json), 422);
        return OperationResult.Ok();
    }

    private static object? TryParseJson(string value)
    {
        try { return JsonSerializer.Deserialize<JsonElement>(value); }
        catch { return value; }
    }

    private static string Trim(string value) => value.Trim().Length > 4000 ? value.Trim()[..4000] : value.Trim();

    private static string PdfADefinition(string iccPath) => $"""
%!PS-Adobe-3.0
[/_objdef {{icc_PDFA}} /type /stream /OBJ pdfmark
[{{icc_PDFA}} << /N 3 >> /PUT pdfmark
[{{icc_PDFA}} ({iccPath}) (r) file /PUT pdfmark
[/_objdef {{OutputIntent_PDFA}} /type /dict /OBJ pdfmark
[{{OutputIntent_PDFA}} << /Type /OutputIntent /S /GTS_PDFA1 /DestOutputProfile {{icc_PDFA}} /OutputConditionIdentifier (sRGB) >> /PUT pdfmark
[{{Catalog}} << /OutputIntents [{{OutputIntent_PDFA}}] >> /PUT pdfmark
""";
}

sealed class CounterSignatureService(ToolLocator tools)
{
    public async Task<OperationResult> CounterSignAsync(string inputPath, string outputPath, string thumbprint, int signerIndex, CancellationToken ct)
    {
        var bridge = tools.FindCryptoProBridge();
        if (bridge is null) return OperationResult.Fail("Нативный CryptoPro bridge не найден. Соберите SignFlow.CryptoProBridge с установленным CryptoPro ЭЦП SDK.", 503);
        var run = await ProcessRunner.RunAsync(bridge, $"counter-sign --input \"{inputPath}\" --output \"{outputPath}\" --thumbprint {thumbprint} --signer-index {signerIndex}", ct);
        return run.ExitCode == 0 && File.Exists(outputPath)
            ? OperationResult.Ok()
            : OperationResult.Fail((run.StdErr + "\n" + run.StdOut).Trim(), 422);
    }
}

readonly record struct OperationResult(bool Success, string? Error, int StatusCode)
{
    public static OperationResult Ok() => new(true, null, 200);
    public static OperationResult Fail(string error, int statusCode) => new(false, error, statusCode);
}

readonly record struct ProcessResult(int ExitCode, string StdOut, string StdErr);

static class ProcessRunner
{
    public static async Task<ProcessResult> RunAsync(string executable, string arguments, CancellationToken ct)
    {
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = executable,
                Arguments = arguments,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                WorkingDirectory = Path.GetDirectoryName(executable) ?? AppContext.BaseDirectory
            }
        };
        process.Start();
        var stdout = process.StandardOutput.ReadToEndAsync(ct);
        var stderr = process.StandardError.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);
        return new ProcessResult(process.ExitCode, await stdout, await stderr);
    }
}

sealed class TempWorkspace : IAsyncDisposable
{
    public string DirectoryPath { get; }
    public string InputPath { get; }
    public string OutputPath { get; }

    private TempWorkspace(string directoryPath, string inputPath)
    {
        DirectoryPath = directoryPath;
        InputPath = inputPath;
        OutputPath = Path.Combine(directoryPath, "output.bin");
    }

    public static async Task<TempWorkspace> CreateAsync(IFormFile file, CancellationToken ct)
    {
        var directory = Path.Combine(Path.GetTempPath(), "SignFlow", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        var safeName = Path.GetFileName(file.FileName);
        var input = Path.Combine(directory, string.IsNullOrWhiteSpace(safeName) ? "input.bin" : safeName);
        await using var stream = new FileStream(input, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1024 * 1024, FileOptions.Asynchronous | FileOptions.SequentialScan);
        await file.CopyToAsync(stream, ct);
        return new TempWorkspace(directory, input);
    }

    public ValueTask DisposeAsync()
    {
        try { Directory.Delete(DirectoryPath, true); } catch { }
        return ValueTask.CompletedTask;
    }
}
