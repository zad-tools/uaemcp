import { UaemcpClient } from "uaemcp";

const client = new UaemcpClient({ baseUrl: Bun.env.UAEMCP_URL ?? "https://uaemcp.zad.tools" });
Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/search") return new Response("Try /search?q=عقارات", { status: 404 });
    return Response.json(await client.search(url.searchParams.get("q") ?? "UAE"));
  },
});
