# Connector plugins

UAEMCP dispatches source access through a runtime registry. A connector can be
added without editing the MCP, REST, catalog, snapshot or intelligence layers.

Built-ins: `http_json`, `ckan`, `ods`, `arcgis`, `csv`, `xlsx`, `sdmx`,
`sparql`, and honest discovery-only `metadata`. XLSX extraction is checked
against a central-directory size budget before decompression. SPARQL permits
bounded `SELECT` only and rejects updates and federated `SERVICE` clauses.

```ts
import { registerConnector } from "uaemcp/connectors";

registerConnector("my_portal", {
  capabilities: {
    records: true,
    search: true,
    schema: true,
    aggregation: true,
    history: true,
    geo: false,
    realtime: false,
    export: ["json", "csv"],
    queryLanguage: "text",
  },
  async fetch(source, options) {
    // Validate and bound options, then return FetchResult.
  },
  async datasets(source, options) {
    // Return DatasetRef[] when the portal contains multiple datasets.
  },
});
```

## Contract

- `fetch` must return a complete `FetchResult`, including citation, license,
  fetch time and data-quality metadata.
- Inputs and upstream pagination must be bounded.
- Network connectors must use the shared SSRF-safe HTTP helpers.
- Direct-contact fields must pass through `redactRecords`.
- A connector must throw an explicit error when records cannot be retrieved;
  empty success must only mean the upstream query genuinely returned no rows.
- `datasets` must return assets that actually exist upstream.
- Capabilities must describe implemented behavior, not planned behavior.

Names are lowercase, 2–32 characters, and may contain digits, `_` or `-`.
Replacing a registered connector is rejected unless `{ replace: true }` is
passed explicitly. Built-in connectors use the same public registry.

After a connector is registered, a write-authorized operator can add a matching
source through `uae_source_add` or `POST /api/v1/sources`. Unknown connector
names are rejected before anything is persisted.
