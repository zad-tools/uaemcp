import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { SETTINGS } from "../src/config.js";
import { getJson } from "../src/http.js";

let server: Bun.Server<unknown>;
let baseUrl: string;
let previousAllowPrivate: boolean;

beforeAll(() => {
  previousAllowPrivate = SETTINGS.allowPrivateHosts;
  SETTINGS.allowPrivateHosts = true;
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/start") return Response.redirect(new URL("/result", request.url), 302);
      if (path === "/result") return Response.json({ ok: true });
      if (path === "/missing-location") return new Response(null, { status: 302 });
      if (path.startsWith("/loop/")) {
        const step = Number(path.split("/").pop());
        return Response.redirect(new URL(`/loop/${step + 1}`, request.url), 302);
      }
      return new Response("not found", { status: 404 });
    },
  });
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => {
  SETTINGS.allowPrivateHosts = previousAllowPrivate;
  server.stop(true);
});

describe("safe upstream redirects", () => {
  it("follows a bounded redirect and parses the final response", async () => {
    expect(await getJson(`${baseUrl}/start`)).toEqual({ ok: true });
  });

  it("rejects redirects without a target and redirect loops", async () => {
    await expect(getJson(`${baseUrl}/missing-location`)).rejects.toThrow("without location");
    await expect(getJson(`${baseUrl}/loop/0`)).rejects.toThrow("redirect limit");
  });
});
