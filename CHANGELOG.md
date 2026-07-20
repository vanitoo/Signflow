## 0.1.2

- Удалена npm-зависимость `@grafit/cadesplugin`, из-за которой установка могла падать с HTTP 503.
- API КриптоПро теперь загружается в браузере с резервного CDN.
- Добавлена последовательная попытка загрузки через jsDelivr и unpkg.

## [Unreleased]

### Fixed

- Replaced the unreliable synchronous `window.cadesplugin` check with the official asynchronous CAdES API bootstrap.
- Added real communication test with `CAdESCOM.About`, including CryptoPro plug-in and CSP version reporting.
- Added retry action and actionable diagnostics for Yandex Browser and other Chromium-based browsers.

# Changelog

## [0.1.0] - 2026-07-18

### Added

- SignFlow branding and application metadata.
- Three operation modes: signing, verification and encryption.
- Multi-file drag-and-drop queue with duplicate, count and size validation.
- Sign settings for CryptoPro or PFX/P12 and one or two independent signatures.
- Explicit timestamp option with a network warning.
- Encryption mode choice for certificate or password.
- Runtime detection for CryptoPro Browser plug-in and Web Crypto API.
- Architecture, security model and implementation roadmap.

### Changed

- Replaced the single-file template demo with a feature-oriented workspace.
- Removed generated `tsconfig.tsbuildinfo` from the repository.
