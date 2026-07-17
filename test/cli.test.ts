import { describe, expect, test } from "bun:test";
import { completionScript, doctorReport, helpText, parseCli } from "../src/cli.js";

describe("CLI", () => {
  test("keeps stdio as the backwards-compatible default", () => {
    expect(parseCli([])).toEqual({ command: "stdio" });
    expect(parseCli(["stdio"])).toEqual({ command: "stdio" });
  });

  test("parses and validates the HTTP command", () => {
    expect(parseCli(["http", "--host", "0.0.0.0", "--port", "9090"])).toEqual({
      command: "http",
      host: "0.0.0.0",
      port: 9090,
    });
    expect(() => parseCli(["http", "--port", "70000"])).toThrow("invalid --port");
    expect(() => parseCli(["http", "--unknown"])).toThrow("unknown option");
  });

  test("supports help, version, doctor and shell completion", () => {
    expect(parseCli(["--help"])).toEqual({ command: "help" });
    expect(parseCli(["version"])).toEqual({ command: "version" });
    expect(parseCli(["doctor", "--json"])).toEqual({ command: "doctor", json: true });
    expect(parseCli(["completion", "zsh"])).toEqual({ command: "completion", shell: "zsh" });
    expect(helpText()).toContain("uaemcp doctor");
    expect(completionScript("zsh")).toContain("#compdef uaemcp");
    expect(completionScript("bash")).toContain("complete -F");
    expect(completionScript("fish")).toContain("complete -c uaemcp");
  });

  test("doctor reports actionable runtime and safety checks", () => {
    const report = doctorReport({
      bunVersion: "1.3.11",
      writeToken: null,
      databasePath: "data/test.sqlite",
      allowedHosts: ["example.com"],
      allowedOrigins: [],
    });
    expect(report.ok).toBe(true);
    expect(report.checks.find((check) => check.id === "writes")?.status).toBe("pass");
    expect(report.checks.find((check) => check.id === "origins")?.status).toBe("warn");
  });
});
