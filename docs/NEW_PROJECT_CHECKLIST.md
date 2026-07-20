# Project release checklist

- [x] Repository, package, title and description use the SignFlow name.
- [x] Header links to `vanitoo/Signflow`.
- [x] Signing, verification, encryption and decryption are implemented.
- [x] Static export respects the GitHub Pages `/Signflow` base path.
- [x] CI runs TypeScript, ESLint, Vitest and the production build.
- [x] GitHub Pages deployment uploads the generated `out/` directory.
- [ ] Configure **Settings → Pages → Source: GitHub Actions** in the repository.
- [ ] Add malformed, empty and large-input tests.
- [ ] Add real CryptoPro and PFX/CMS fixtures.
- [x] Resolve current dependency audit findings and enable a CI audit gate plus Dependabot.
- [ ] Complete a Windows browser smoke test with CryptoPro CSP and the extension installed.
- [ ] Confirm signing, verification, `.p7m` and `.sfenc` round trips on the deployed HTTPS origin.
