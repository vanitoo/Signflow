# TODO

## 0.2 — signing foundation

- [x] Add CryptoPro adapter and asynchronous plug-in readiness detection.
- [x] Vendor the official `cadesplugin_api.js` for same-origin loading.
- [x] Enumerate private-key certificates from the Windows store and hardware tokens.
- [x] Add RSA PFX/P12 import with in-memory password handling.
- [x] Create detached CAdES-BES/CMS `.sig` files.
- [x] Add two independent CryptoPro signatures over one source file.
- [ ] Introduce explicit provider-neutral application contracts instead of importing adapters in the page.
- [ ] Add CryptoPro, CMS and PFX cryptographic fixtures to automated tests.
- [ ] Support two independent PFX/P12 signers.

## 0.3 — verification

- [x] Verify detached CMS/CAdES signatures through CryptoPro.
- [x] Accept binary and Base64-encoded `.sig` files.
- [x] Pair `.sig`, `.1.sig` and `.2.sig` files with their originals.
- [x] Show expandable per-signer certificate and validation details.
- [ ] Parse and verify attached CMS/CAdES containers.
- [ ] Validate certificate chains against the operating-system trust store.
- [ ] Add explicit certificate-time, CRL and OCSP statuses.
- [ ] Export verification reports as JSON/PDF.

## 0.4 — batch and timestamp

- [x] Add a validated queue for up to 100 files.
- [x] Show per-file processing, completion and error states.
- [ ] Move hashing, Base64 conversion and ASN.1 parsing to Web Workers.
- [ ] Replace whole-file buffering with streaming where provider APIs permit it.
- [ ] Add bounded concurrency, cancellation and safe multi-file download packaging.
- [ ] Add an explicit TSA configuration flow and CAdES-T signatures.

## 0.5 — encryption and decryption

- [x] Use CMS EnvelopedData (`.p7m`) for certificate encryption.
- [x] Implement CryptoPro recipient-certificate encryption and private-key decryption.
- [x] Implement `.sfenc` password encryption with AES-256-GCM.
- [x] Derive password keys with PBKDF2-SHA-256 and 250,000 iterations.
- [x] Add password-container decryption and wrong-password diagnostics.
- [ ] Add an authenticated format version, original metadata and compatibility documentation for `.sfenc`.
- [ ] Add certificate selection from public certificates that do not have a local private key.

## 0.6 — quality and delivery

- [x] Add Vitest and AES-GCM round-trip/error tests.
- [x] Add TypeScript, ESLint, tests and build checks to GitHub Actions.
- [x] Configure static export and deployment to GitHub Pages.
- [x] Make public assets respect the GitHub project-page base path.
- [ ] Add UI tests for signing, verification, encryption and decryption flows.
- [ ] Add a Windows end-to-end test job with CryptoPro installed.
- [ ] Review and resolve dependency audit findings before a release.
