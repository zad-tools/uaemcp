import { registerConnector, type Connector } from "uaemcp/connectors";

export const connector: Connector = {
  capabilities: { datasets: true, records: true, search: true, geo: false, aggregation: false, export: ["json"], history: false, schema: true },
  async datasets() { return []; },
  async fetch() {
    throw new Error("Implement a bounded official fetch before registering this connector");
  },
};

registerConnector("example", connector);
