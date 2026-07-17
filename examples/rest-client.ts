import { UaemcpClient } from "uaemcp";

const client = new UaemcpClient({ baseUrl: Bun.env.UAEMCP_URL ?? "http://127.0.0.1:8080" });
const matches = await client.search("عقارات دبي", { deep: true });
console.log(JSON.stringify(matches, null, 2));
