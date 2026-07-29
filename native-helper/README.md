# SignFlow Native Helper

Локальный Windows-компонент для функций, которые нельзя надёжно выполнить в браузере:

- `GET /v1/status` — состояние helper и обнаруженных инструментов;
- `POST /v1/pdf/validate-pdfa` — проверка PDF/A через veraPDF;
- `POST /v1/pdf/convert-to-pdfa` — преобразование PDF в PDF/A-2b через Ghostscript и обязательная последующая проверка veraPDF;
- `POST /v1/cades/counter-sign` — настоящая CAdES-контрподпись через нативный мост CryptoPro ЭЦП SDK.

Helper слушает только `127.0.0.1:17891`. Документы сохраняются во временную папку только на время операции и удаляются после ответа.

## Быстрый запуск preview

1. Откройте GitHub Actions в ветке `feature/pdfa-native-helper`.
2. Скачайте artifact `SignFlow-NativeHelper-0.1.0-preview.1-win-x64`.
3. Распакуйте архив в отдельную папку.
4. Запустите `SignFlow.NativeHelper.exe`.
5. Откройте в браузере `http://127.0.0.1:17891/v1/status`.

Ожидаемый ответ:

```json
{
  "service": "SignFlow Native Helper",
  "version": "0.1.0-preview.1",
  "capabilities": [],
  "tools": {
    "ghostscript": false,
    "veraPdf": false,
    "cryptoProBridge": false
  }
}
```

Возможности появляются только после обнаружения соответствующих локальных инструментов.

## PDF/A

Установите:

- Ghostscript x64;
- veraPDF CLI;
- системный sRGB ICC-профиль.

Helper ищет инструменты автоматически. Пути можно задать переменными среды:

```powershell
$env:SIGNFLOW_GHOSTSCRIPT = "C:\Program Files\gs\gs10.xx.x\bin\gswin64c.exe"
$env:SIGNFLOW_VERAPDF = "C:\Program Files\veraPDF\verapdf.bat"
$env:SIGNFLOW_ICC_PROFILE = "C:\Windows\System32\spool\drivers\color\sRGB Color Space Profile.icm"
.\SignFlow.NativeHelper.exe
```

Проверка:

```powershell
curl.exe -F "file=@document.pdf" -F "profile=2b" http://127.0.0.1:17891/v1/pdf/validate-pdfa
```

Конвертация:

```powershell
curl.exe -o document_PDFA.pdf -F "file=@document.pdf" http://127.0.0.1:17891/v1/pdf/convert-to-pdfa
```

Helper не выдаёт результат как PDF/A только по наличию XMP-метки. После Ghostscript он запускает veraPDF и возвращает файл лишь при подтверждённом соответствии PDF/A-2b.

## CAdES-контрподпись

Проект `SignFlow.CryptoProBridge` использует:

- Windows CryptoAPI;
- `cades.h`;
- `cades.lib` / `cades.dll`;
- `CadesMsgCountersign`.

Для сборки нужны:

1. Visual Studio 2022 с компонентом **Desktop development with C++**;
2. установленный CryptoPro CSP;
3. CryptoPro ЭЦП SDK с заголовком `cades.h` и библиотекой `cades.lib`;
4. x64-конфигурация, совпадающая с установленными библиотеками CryptoPro.

Собранный файл положите рядом с helper:

```text
SignFlow.NativeHelper.exe
SignFlow.CryptoProBridge.exe
```

Либо задайте путь:

```powershell
$env:SIGNFLOW_CRYPTOPRO_BRIDGE = "C:\SignFlow\SignFlow.CryptoProBridge.exe"
```

После этого `/v1/status` должен вернуть capability:

```json
"cades-counter-signature"
```

Тест прямого вызова bridge:

```powershell
.\SignFlow.CryptoProBridge.exe counter-sign `
  --input document.pdf.sig `
  --output document.pdf.countersigned.sig `
  --thumbprint 001122AABB... `
  --signer-index 0
```

Сертификат с закрытым ключом должен находиться в хранилище текущего пользователя `Личное / My`.

## Сборка helper локально

```powershell
dotnet publish .\SignFlow.NativeHelper\SignFlow.NativeHelper.csproj `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -o .\dist
```

## Ограничения preview

- installer и автозапуск с Windows пока не добавлены;
- C++ bridge не собирается на публичном GitHub runner, потому что CryptoPro ЭЦП SDK не входит в образ runner;
- CAdES-T для контрподписи в первом preview ещё не подключён;
- разрешены только origin `https://vanitoo.github.io` и локальная разработка на порту 3000;
- перед релизом нужен pairing-токен между сайтом и helper, подпись установщика и автоматическое обновление.
