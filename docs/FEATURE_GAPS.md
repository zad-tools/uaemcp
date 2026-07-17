# Feature gaps after v1.65

## Executive finding

The platform exposes sixteen verified public products, but most research still
ends as separate pages and JSON responses. The highest-value missing workflow
is a way to compose selected facts into one source-cited, bilingual deliverable.

## Evidence map

| Gap | Current evidence | Priority |
| --- | --- | --- |
| Cross-product research workflow | Sixteen entries in `src/products.ts`; only the fixed four-pillar National Brief composes data | P1 |
| Policy freshness monitoring | Founder, setup, support and residency catalogues carry a fixed verification date | P1 |
| Live national breadth | 41 indexed sources and nine live record connectors | P1 |
| Tool documentation parity | MCP registrations and the manually maintained README table can drift | P2 |

## Highest-ROI feature

**UAE Evidence Studio** composes selected existing evidence products into a
stateless dossier. Every fact retains its period, unit, scope, delivery mode,
citation and limitations. It does not use an LLM, calculate a composite score,
rank incompatible evidence or turn unavailable data into zero.

## Next gaps

1. Monitor official policy pages and report freshness or detected changes.
2. Add licensed national live connectors beyond the current nine.
3. Generate the public MCP tool catalogue from one contract.
4. Add the audited Ajman parks footfall dataset as a source-native civic product.
