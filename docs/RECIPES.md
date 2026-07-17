# Intelligence recipes

Recipes compose existing, cited primitives without creating hundreds of MCP
tools. Discover them through `uae_intelligence_recipe` or
`GET /api/v1/intelligence/recipes`.

| Recipe | Use |
| --- | --- |
| `source_coverage` | Compare live, key-gated, blocked and metadata-only access |
| `dataset_freshness` | Explain freshness using measured observations |
| `historical_comparison` | Compare two stored snapshots |
| `emirate_comparison` | Group records using bilingual emirate normalization |
| `trend_analysis` | Describe a snapshot trend without claiming causation |

Each result carries methodology, evidence, limitations and citations. A recipe
fails explicitly when the required observations or queryable source are absent.
That boundary prevents an agent from turning missing data into a national claim.
