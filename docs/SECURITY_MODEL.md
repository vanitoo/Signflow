# Security model

## Protected data

- Original files
- Private keys and PFX/P12 passwords
- Certificate selections
- Generated signatures and encrypted containers

## Rules

1. Private keys must never be exported from CryptoPro or token storage.
2. PFX/P12 passwords must remain in memory only and must not be persisted.
3. No file contents may be logged.
4. No analytics, telemetry or remote error reporting.
5. Network validation and timestamping are opt-in operations.
6. Verification results must distinguish cryptographic validity, certificate time validity, trust-chain status and revocation status.
7. Third-party scripts and remote fonts are prohibited.
8. Dependencies added to cryptographic code require review and justification.

## Threats to address next

- Malicious or malformed ASN.1/CMS input
- Memory exhaustion from large files or containers
- PFX password brute-force behavior
- Provider spoofing and untrusted browser extensions
- Unsafe filename handling in batch downloads
- CORS and privacy leakage in TSA/CRL/OCSP requests
