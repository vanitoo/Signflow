# TODO

## 0.2 — signing foundation

- [ ] Define provider-neutral signing and verification contracts
- [ ] Add CryptoPro adapter and robust plugin readiness detection
- [ ] Enumerate certificates from the Windows store
- [ ] Add PFX/P12 import with in-memory password handling
- [ ] Create detached CAdES-BES `.sig`
- [ ] Add two independent signatures over one source file
- [ ] Add cryptographic fixtures and automated tests

## 0.3 — verification

- [ ] Parse attached and detached CMS/CAdES containers
- [ ] Pair `.sig` files with originals
- [ ] Show per-signer structured validation details
- [ ] Export verification reports

## 0.4 — batch and timestamp

- [ ] Move hashing and parsing to Web Workers
- [ ] Add bounded concurrency and cancellation
- [ ] Add explicit TSA flow and CAdES-T
- [ ] Add optional CRL/OCSP checks

## 0.5 — encryption

- [ ] Select interoperable certificate-encryption container
- [ ] Implement recipient-certificate encryption
- [ ] Implement password encryption with documented KDF settings
