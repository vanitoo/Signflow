# Security policy

SignFlow processes documents and cryptographic material locally in the browser. It does not provide an application server for file uploads and does not include analytics or telemetry.

## Supported version

Security fixes currently target the latest `main` branch. No stable release line is maintained yet.

## Reporting a vulnerability

Report vulnerabilities through a private GitHub security advisory in `vanitoo/Signflow`. Do not include real private keys, production PFX/P12 files, passwords or confidential documents in a report. Use generated test material instead.

Useful reports include reproduction steps, affected browser and operating system, CryptoPro CSP and extension versions when relevant, and the security impact.

## Contributor requirements

- Never log document contents, PFX/P12 passwords or private-key material.
- Do not add analytics, telemetry or remote uploads silently.
- Treat ASN.1, CMS, PFX, `.sig`, `.p7m` and `.sfenc` inputs as untrusted data.
- Keep network-dependent TSA, CRL and OCSP operations opt-in and visible.
- Review cryptographic and supply-chain dependencies before merging.
- Do not claim certificate trust or revocation validation when only cryptographic integrity was checked.
- Run `npm run check` before submitting a security-sensitive change.

See [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for the detailed model and current limitations.
