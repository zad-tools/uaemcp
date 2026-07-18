# @open-emirates/sdk

Typed TypeScript client for Open Emirates official-data products.

```ts
import { OpenEmiratesClient } from "@open-emirates/sdk";

const client = new OpenEmiratesClient();
const result = await client.search("industrial activity", { limit: 10 });
```

## Schema-driven MCP tools

The SDK discovers the live tool catalogue, caches it by schema and server version,
validates arguments locally and invokes public read tools through the bounded REST bridge.
Known tools retain generated TypeScript autocomplete; tools added by a newer server
remain callable through the dynamic string overload.

```ts
const catalogue = await client.tools.list();
const goldenResidency = await client.tools.get("uae_golden_residency");

const result = await client.tools.call(
  goldenResidency.name,
  goldenResidency.exampleArguments,
);
```

`uae_golden_residency` provides informational readiness routing only. Competent
official authorities make eligibility and residence decisions.

The client validates response envelopes, applies bounded timeouts, retries transient
failures and provides bounded record pagination. It has no MCP dependency.
