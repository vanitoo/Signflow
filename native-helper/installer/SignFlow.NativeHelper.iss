#define MyAppName "SignFlow Native Helper"
#define MyAppVersion "0.1.0-preview.2"
#define MyAppPublisher "SignFlow"
#define MyAppExeName "SignFlow.NativeHelper.exe"

[Setup]
AppId={{8B2E668D-721B-4E90-931C-979FD08978CC}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\SignFlow\Native Helper
DefaultGroupName=SignFlow
DisableProgramGroupPage=yes
OutputDir=..\installer-dist
OutputBaseFilename=SignFlowNativeHelperSetup-{#MyAppVersion}-win-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#MyAppExeName}

[Files]
Source: "..\package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\SignFlow Native Helper"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Запустить SignFlow Native Helper"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{cmd}"; Parameters: "/C taskkill /IM SignFlow.NativeHelper.exe /F"; Flags: runhidden; RunOnceId: "StopSignFlowNativeHelper"
