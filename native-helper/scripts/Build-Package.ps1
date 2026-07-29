param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64",
    [switch]$RequirePdfTools
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root "SignFlow.NativeHelper\SignFlow.NativeHelper.csproj"
$program = Join-Path $root "SignFlow.NativeHelper\Program.cs"
$publish = Join-Path $root "publish"
$package = Join-Path $root "package"

Remove-Item $publish, $package -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $publish, $package | Out-Null

[xml]$projectXml = Get-Content $project
$version = [string]$projectXml.Project.PropertyGroup.Version
if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Version is missing in SignFlow.NativeHelper.csproj."
}

$originalProgram = Get-Content $program -Raw
$versionedProgram = $originalProgram -replace 'const string Version = "[^"]+";', "const string Version = `"$version`";"
if ($versionedProgram -eq $originalProgram) {
    throw "Could not update Native Helper API version in Program.cs."
}

try {
    Set-Content $program $versionedProgram -Encoding utf8
    dotnet publish $project -c $Configuration -r $Runtime --self-contained true `
        -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true -o $publish
} finally {
    Set-Content $program $originalProgram -Encoding utf8
}

Copy-Item (Join-Path $publish "*") $package -Recurse -Force
Copy-Item (Join-Path $root "README.md") (Join-Path $package "README.md") -Force

$toolSource = Join-Path $root "tools"
if (Test-Path $toolSource) {
    Copy-Item $toolSource (Join-Path $package "tools") -Recurse -Force
}

$assetSource = Join-Path $root "assets"
if (Test-Path $assetSource) {
    Copy-Item $assetSource (Join-Path $package "assets") -Recurse -Force
}

$ghostscript = Join-Path $package "tools\ghostscript\bin\gswin64c.exe"
$veraPdf = Join-Path $package "tools\verapdf\verapdf.bat"
if ($RequirePdfTools -and (!(Test-Path $ghostscript) -or !(Test-Path $veraPdf))) {
    throw "Для полного установочного пакета нужны проверенные redistributable-компоненты Ghostscript и veraPDF в native-helper/tools."
}

Write-Host "Package prepared: $package"
Write-Host "Version: $version"
Write-Host "Ghostscript bundled: $(Test-Path $ghostscript)"
Write-Host "veraPDF bundled: $(Test-Path $veraPdf)"