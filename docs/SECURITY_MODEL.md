# Security model

## Protected data

- Original and decrypted files.
- PFX/P12 containers, private keys and passwords.
- CryptoPro certificate selections and private-key operations.
- Generated signatures and encrypted containers.

## Implemented controls

1. CryptoPro and token private keys are used through CAdESCOM and are never exported.
2. PFX/P12 files and passwords remain in browser memory and are not persisted by SignFlow.
3. Password containers use AES-256-GCM with PBKDF2-SHA-256, 250,000 iterations, a random salt and a random IV.
4. No analytics, telemetry, remote error reporting or application-server uploads are present.
5. TSA and certificate-revocation network operations require explicit user choices; document bytes are not sent to the TSA.
6. File contents and passwords are not intentionally logged.
7. The official CAdES loader is vendored in `public/` and loaded from the application origin first.
8. Dependencies that process cryptographic material are isolated in provider modules.

## Validation semantics

A successful detached-signature check currently means that CryptoPro verified the CMS/CAdES signature against the supplied document. It does not yet prove:

- trust in the full certificate chain unless the optional online check was enabled and completed successfully;
- certificate revocation status unless the optional check completed using correctly configured and reachable CRL/OCSP services;
- validity at a trusted timestamp;
- availability or policy compliance of external CRL/OCSP/TSA services.

The UI states this limitation in verification details.

## Remaining threats

- Malicious or malformed ASN.1, CMS, PFX and JSON containers.
- Memory exhaustion from whole-file buffering and Base64 expansion.
- PFX password guessing and excessive repeated attempts.
- Provider spoofing or a compromised browser extension.
- Unsafe filenames and browser restrictions during batch downloads.
- Supply-chain risk in npm dependencies and external CAdES fallback sources.
- CORS and privacy leakage when TSA, CRL or OCSP support is introduced.
- Loss of `.sfenc` metadata or format compatibility without a migration policy.

## Release requirements

- Keep `npm run audit` at zero moderate/high/critical advisories; review Dependabot updates without applying breaking upgrades blindly.
- Add malformed-container and cryptographic fixture tests.
- Add practical file-size limits based on measured browser memory use.
- Document every future network destination and the data sent to it.
