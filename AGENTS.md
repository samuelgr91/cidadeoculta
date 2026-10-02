# Production verification

- Before visiting production pages for development, screenshots, feature checks or QA, open https://hiddenatlas.site/nao-contar-visitas in the browser being used. If it is not already active, click “Excluir visitas deste navegador” and confirm the active status before browsing. This must be repeated for each fresh browser profile. Do not rely on admin login for test exclusion.
- HTTP verification requests to production must carry `X-Co-Internal-Test: 1`, `Cookie: co_analytics_excluded=1` and an identifiable User-Agent such as `HiddenAtlas-Verification/1.0`. Never submit an unmarked analytics event for a production test.
- Use an in-memory database for analytics tests with genuine visitor fixtures. Exclude only known development visitors from production; do not guess visitors from device, page paths or times, reset audience tables or delete historical visits.
- Preserve production accounts, CMS changes, leads and payments. Never print secret environment variables or credentials.
- Parent project instructions apply: synced sources are read-only.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
