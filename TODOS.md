# TODOs

## Fix or remove untracked Apify files

**Files:** `src/lib/apify/client.ts`, `src/lib/apify/fetch-results.ts`, `src/lib/apify/run-scrape.ts`

These files are untracked, not imported anywhere in the codebase, and currently produce TypeScript module errors. Either wire them into the scrape flow properly (if they are intended as the Apify integration layer) or delete them.

**Priority:** Medium — the TS errors are isolated and don't affect the build or runtime, but they pollute `tsc --noEmit` output and make it hard to spot real new errors.
