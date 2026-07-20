# SignFlow

SignFlow is a local-first browser application for signing, verifying, encrypting and decrypting files without uploading document contents to an application server.

## Implemented

- Detached CAdES-BES signatures (`.sig`) through CryptoPro CSP.
- Windows certificate store and hardware-token certificate discovery.
- One or two independent CryptoPro signatures over the same source file.
- Detached CMS/CAdES verification with signer and certificate details.
- RSA PFX/P12 signing with in-memory password handling.
- Certificate encryption as CMS EnvelopedData (`.p7m`) and CryptoPro decryption.
- Password encryption as SignFlow AES-256-GCM containers (`.sfenc`) and decryption.
- Batch queue with up to 100 files and a 2 GB per-file UI guardrail.
- Static GitHub Pages deployment and CI checks.

## Current limitations

- GOST PFX/P12 containers are not parsed by the browser RSA adapter; import them into CryptoPro first.
- PFX/P12 signing currently supports one RSA signer and SHA-256.
- Trusted timestamping (CAdES-T), CRL/OCSP checks and trust-chain validation are not implemented yet.
- Verification currently handles detached signatures, not attached CMS/CAdES containers.
- Large files are processed in browser memory; streaming, Web Workers and cancellation remain planned.
- The `.sfenc` password container is a SignFlow format, not a general-purpose CMS standard.

## Local development

Requires Node.js 22.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Run the full validation pipeline:

```bash
npm run check
```

Individual commands are `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build`.

Dependency security checks are available as `npm run audit` for the complete tree and `npm run audit:prod` for production dependencies. CI blocks moderate, high and critical advisories; Dependabot checks npm and GitHub Actions weekly.

## GitHub Pages

The application uses Next.js static export. [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds and deploys `out/` after every push to `main`, and also supports manual dispatch.

In the repository settings, select **Settings → Pages → Build and deployment → Source: GitHub Actions**. The project URL is `https://vanitoo.github.io/Signflow/`.

## Privacy and security

Documents, PFX/P12 files, passwords and private-key operations remain on the user device. CryptoPro private keys are accessed through the installed provider and are not exported. SignFlow has no registration, analytics or telemetry.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) and [SECURITY.md](SECURITY.md).

## License

MIT
