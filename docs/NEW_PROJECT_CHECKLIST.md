# New project checklist

1. Rename the repository and package in `package.json`.
2. Replace title and description in `src/app/layout.tsx`.
3. Replace `OWNER/REPOSITORY` in the header.
4. Rename `file-processing` to the actual feature.
5. Implement validation and processing in the feature folder.
6. Add accepted MIME types and size limits to the dropzone.
7. Add unit tests for malformed, empty and large inputs.
8. Run `npm run check`.
9. Enable GitHub Pages with **GitHub Actions** as source.
10. Review `SECURITY.md` before adding any dependency or network request.
