# Changelog

## [Unreleased]

### Added

- CryptoPro CAdES-BES detached signing with Windows-store and hardware-token certificates.
- One or two independent signatures over the same source file.
- RSA PFX/P12 import and detached PKCS#7 signing.
- Detached signature verification with expandable signer and certificate details.
- CMS EnvelopedData certificate encryption and CryptoPro decryption (`.p7m`).
- AES-256-GCM password encryption and decryption (`.sfenc`) using PBKDF2-SHA-256 with 250,000 iterations.
- Vitest coverage for password-encryption round trips and error cases.
- GitHub Pages static-export deployment workflow.

### Changed

- The official CryptoPro loader is served locally before any fallback source.
- CryptoPro readiness uses the asynchronous CAdES API and a real `CAdESCOM.About` probe.
- Queue rows now display processing, completion and error states.
- CI runs type checking, linting, tests and a production build.
- GitHub Pages builds use the `/Signflow` base path for scripts, styles and public assets.

### Fixed

- Fixed CryptoPro `CreateObjectAsync` initialization and delayed extension readiness.
- Fixed CSP and plug-in version display returning native function source text.
- Fixed public `cadesplugin_api.js` loading on GitHub project pages.

## [0.1.2] - 2026-07-18

### Changed

- Removed the unreliable `@grafit/cadesplugin` npm dependency.
- Added browser-side CAdES API loading with fallback sources.

## [0.1.0] - 2026-07-18

### Added

- SignFlow branding and application metadata.
- Signing, verification and encryption workspace modes.
- Multi-file drag-and-drop queue with duplicate, count and size validation.
- Runtime detection for CryptoPro Browser plug-in and Web Crypto API.
- Initial architecture, security model and implementation roadmap.
