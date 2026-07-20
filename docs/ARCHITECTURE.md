# SignFlow architecture

## Principles

- Static export and local-first file handling.
- Cryptographic implementations live in provider adapters.
- Document bytes, private keys and passwords are not sent to an application server.
- Verification distinguishes cryptographic integrity from certificate trust and revocation.
- Network-dependent TSA, CRL and OCSP operations must be explicit and visible.

## Current structure

```text
Next.js client page
  -> workspace queue and settings
    -> CryptoPro adapter (CAdESCOM)
    -> RSA PFX/P12 adapter (node-forge)
    -> password-container adapter (Web Crypto)
```

- `features/workspace`: operation modes, queue, settings, file validation and result presentation.
- `features/crypto-providers/lib/detect-capabilities.ts`: CAdES loader and provider diagnostics.
- `features/crypto-providers/lib/cryptopro-signer.ts`: CryptoPro certificate discovery, signing, verification and CMS encryption/decryption.
- `features/crypto-providers/lib/pfx-signer.ts`: in-memory RSA PFX/P12 parsing and detached signing.
- `features/crypto-providers/lib/password-encryption.ts`: versioned password-container cryptography.
- `components/ui`: reusable visual primitives.

The page currently orchestrates adapters directly. Moving orchestration behind provider-neutral use-case contracts remains planned.

## Signature formats

- CryptoPro produces detached CAdES-BES signatures.
- RSA PFX/P12 produces detached CMS/PKCS#7 signatures with SHA-256.
- Two CryptoPro signatures are independent files (`.1.sig` and `.2.sig`), not countersignatures.
- Verification currently accepts detached binary or Base64 CMS/CAdES signatures.
- CryptoPro can create CAdES-T when the user explicitly enables timestamping and supplies a TSA URL.
- Online verification is opt-in and delegates chain/revocation processing to CryptoPro and the Windows certificate infrastructure.

## Encryption formats

- Certificate encryption uses CMS EnvelopedData and the `.p7m` extension.
- Password encryption uses a SignFlow JSON container with AES-256-GCM, PBKDF2-SHA-256, a random 128-bit salt, a random 96-bit IV and 250,000 iterations.
- `.sfenc` is application-specific and is not advertised as an interoperable CMS format.

## Delivery

Next.js uses `output: "export"`. GitHub Actions builds `out/` with the `/Signflow` base path and deploys it through GitHub Pages artifacts.

## Limits

- Up to 100 queue entries and a 2 GB per-file UI guardrail.
- Cryptographic operations currently buffer complete files in memory.
- Browser automatic-download policies may require confirmation for large batches.
- Streaming, Web Workers, bounded concurrency and cancellation are required before the maximum limits can be considered production-safe.
