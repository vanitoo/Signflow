# SignFlow architecture

## Principles

- Static export and local-first file handling.
- Cryptographic providers are adapters, not UI dependencies.
- No hidden network traffic.
- Structured verification results instead of a single misleading “valid” flag.
- Batch processing uses explicit jobs and bounded concurrency.

## Layers

```text
UI workspace
  -> application use cases
    -> domain contracts
      -> CryptoPro / PFX-WebCrypto / verifier / timestamp adapters
```

## Current modules

- `features/workspace`: file queue, operation choice, settings and validation.
- `features/crypto-providers`: runtime capability detection and future provider adapters.
- `components/ui`: reusable visual primitives.
- `lib`: generic formatting and browser helpers.

## Provider boundary

The signing implementation must expose a provider-neutral contract. UI components must never call `window.cadesplugin` or Web Crypto directly. CryptoPro and PFX/P12 implementations will live behind separate adapters.

## Multiple signatures

The product requirement is two independent signatures over the same original content. It is not a countersignature. The container strategy must preserve both signer infos and must be covered by fixtures from at least two distinct certificates.

## Network policy

- Disabled by default.
- TSA, CRL and OCSP are separate application capabilities.
- Every request must state the destination and the data category being sent.
- Document bytes must never be transmitted. Only protocol-required digests or certificate identifiers may leave the device.

## Limits

Initial safe UI limits:

- 100 files per batch.
- 2 GB per file.
- Recommended aggregate batch size: 5 GB.

These are guardrails, not a claim that every browser can process the full maximum. Streaming and workers are required before cryptographic processing of large files is enabled.
