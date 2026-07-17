import { describe, expect, it } from "bun:test";
import { BlockedRequest } from "../src/errors.js";
import { isBlockedIp, validateUrl } from "../src/ssrf.js";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.5.4",
    "192.168.0.10",
    "169.254.13.37",
    "169.254.169.254", // cloud metadata
    "100.100.100.200", // alibaba metadata (CGNAT range)
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1", // ipv4-mapped loopback
    "fd00::1",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888"])("allows public %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe("validateUrl", () => {
  it.each([
    "http://127.0.0.1/admin",
    "http://localhost:8080/",
    "https://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "ftp://example.com/file",
    "file:///etc/passwd",
  ])("blocks %s", async (url) => {
    await expect(validateUrl(url)).rejects.toBeInstanceOf(BlockedRequest);
  });

  it("allows a public host", async () => {
    await expect(validateUrl("https://example.com/")).resolves.toBe("https://example.com/");
  });

  it("honors the allowPrivate escape hatch", async () => {
    await expect(validateUrl("http://127.0.0.1/", { allowPrivate: true })).resolves.toBe(
      "http://127.0.0.1/",
    );
  });
});
