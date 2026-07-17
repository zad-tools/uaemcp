# Feature priority roadmap

Priority score = user value + platform value + testability + reversibility -
effort - technical risk - dependency complexity.

| Candidate | User | Platform | Test | Reverse | Effort | Risk | Dependencies | Score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| UAE Evidence Studio | 5 | 5 | 5 | 5 | 3 | 2 | 1 | 14 |
| Policy Evidence Watch | 5 | 5 | 4 | 4 | 4 | 3 | 3 | 8 |
| Ajman Parks Footfall | 4 | 3 | 5 | 5 | 2 | 2 | 1 | 12 |
| Generated tool catalogue | 3 | 4 | 5 | 5 | 3 | 2 | 2 | 10 |

## Sprint order

### Sprint 1 — UAE Evidence Studio

- Compose two to five bounded evidence pillars in parallel.
- Publish web, REST and MCP contracts.
- Support bilingual print, Markdown and JSON exports without server storage.
- Keep unavailable pillars explicit and incompatible units separate.

### Sprint 2 — Policy Evidence Watch

**Status: complete in v1.67.0.** Five audited official surfaces, bounded hashes and excerpts, retained observations, daily scheduling, REST, MCP and bilingual product UI are implemented.

- Register every official policy page used by founder-facing products.
- Store bounded content fingerprints and last-check results.
- Surface freshness and detected changes through the Observatory.

### Sprint 3 — Civic live-data breadth

**Status: complete in v1.68.0.** Ajman Parks Footfall is live with full pagination, a verified aggregate snapshot fallback, explicit malformed-value accounting and a strict visits-not-people evidence boundary.

- Add the audited Ajman parks footfall product with snapshot fallback.
- Preserve visits as published observations, not unique people or demand.

### Sprint 4 — Generated MCP tool catalogue

**Status: complete in v1.69.0.** The Markdown catalogue, machine-readable JSON
and `uae://tools` resource are generated directly from the 38 runtime
registrations. The release gate rejects stale artifacts and the duplicate
README inventory has been removed.

## What not to build yet

- No generative narrative or uncited AI summary.
- No national composite score or automated investment recommendation.
- No cross-source joins without explicit semantic mappings.
