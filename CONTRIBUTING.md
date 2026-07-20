# Contributing

1. Use Node.js 22 and install the locked dependency tree with `npm ci`.
2. Create a focused branch and keep provider logic inside `features/crypto-providers`.
3. Add tests for changed behavior and fixtures for cryptographic format changes.
4. Run `npm run check` before opening a pull request.
5. Do not add network calls, tracking or cryptographic dependencies without documented justification.
6. Update `README.md`, `CHANGELOG.md` and `TODO.md` when behavior or roadmap status changes.
