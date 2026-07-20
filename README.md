# SignFlow

SignFlow is a local-first application for signing, verifying, batch-processing and encrypting files.

## MVP scope

- Windows-first interface
- Detached CAdES signatures (`.sig`)
- One or two independent signatures for the same source document
- CryptoPro system certificate store and hardware-token integration
- PFX/P12 certificate import path
- Batch queue: up to 100 files, 2 GB per file
- Certificate- and password-based encryption paths
- Optional timestamp, CRL and OCSP network access only after an explicit user action

The current version supports CryptoPro and RSA PFX/P12 signing, detached-signature verification, and certificate- or password-based encryption and decryption.

## GitHub Pages

The site is exported as static files and deployed by `.github/workflows/deploy-pages.yml` after every push to `main`.

In the repository settings, select **Settings → Pages → Build and deployment → Source: GitHub Actions**. The project page will be available at `https://vanitoo.github.io/Signflow/`.

## Privacy

User files are never uploaded to an application server. SignFlow has no registration, analytics or cookies. Network operations such as TSA, CRL and OCSP must be optional, visible and initiated explicitly.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run check
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).

## License

MIT
