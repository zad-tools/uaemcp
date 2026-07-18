# @open-emirates/sdk

Typed TypeScript client for Open Emirates official-data products.

```ts
import { OpenEmiratesClient } from "@open-emirates/sdk";

const client = new OpenEmiratesClient();
const result = await client.search("industrial activity", { limit: 10 });
```

The client validates response envelopes, applies bounded timeouts, retries transient failures and provides bounded record pagination. It has no MCP dependency.
