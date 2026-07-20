# Security Policy

This template is designed for local browser processing.

- Do not upload user files unless the product explicitly requires it.
- Do not add analytics or telemetry silently.
- Avoid rendering untrusted HTML. Parse input as data.
- Validate file type, size and structure before processing.
- Move expensive work to a Web Worker and enforce practical limits.
- Audit dependencies before release.

Report vulnerabilities through a private GitHub security advisory.
