# Feature gaps after v1.65

## Executive finding

The platform exposes twenty-one verified public products, but most research still
ends as separate pages and JSON responses. The highest-value missing workflow
is a way to compose selected facts into one source-cited, bilingual deliverable.

## Evidence map

| Gap | Current evidence | Priority |
| --- | --- | --- |
| Cross-product research workflow | Twenty-one entries in `src/products.ts`; Evidence Studio composes bounded source-native evidence | P1 |
| Policy freshness monitoring | Complete in v1.67 across five audited official surfaces | Complete |
| Live national breadth | 46 indexed sources and fourteen live record connectors; GCAA adds a current publication-index feed and MOHAP GIS adds 7,471 valid published coordinates from 15,326 rows | P1 |
| Tool documentation parity | Complete in v1.69: Markdown, JSON and `uae://tools` are generated from runtime registrations | Complete |

## Highest-ROI feature

**UAE Evidence Studio** composes selected existing evidence products into a
stateless dossier. Every fact retains its period, unit, scope, delivery mode,
citation and limitations. It does not use an LLM, calculate a composite score,
rank incompatible evidence or turn unavailable data into zero.

## Next gaps

1. Add licensed national live connectors beyond the current thirteen.
2. Add licensed national live connectors with stable machine APIs.
