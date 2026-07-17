import { SETTINGS } from "./config.js";

export type Shell = "bash" | "zsh" | "fish";
export type CliCommand =
  | { command: "stdio" }
  | { command: "http"; host?: string; port?: number }
  | { command: "help" }
  | { command: "version" }
  | { command: "doctor"; json: boolean }
  | { command: "completion"; shell: Shell };

export interface DoctorCheck {
  id: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export function parseCli(args: string[]): CliCommand {
  if (!args.length || args[0] === "stdio") return { command: "stdio" };
  if (["help", "--help", "-h"].includes(args[0])) return { command: "help" };
  if (["version", "--version", "-v"].includes(args[0])) return { command: "version" };
  if (args[0] === "doctor") {
    const rest = args.slice(1);
    if (rest.some((arg) => arg !== "--json")) throw new Error(`unknown option: ${rest.find((arg) => arg !== "--json")}`);
    return { command: "doctor", json: rest.includes("--json") };
  }
  if (args[0] === "completion") {
    const shell = args[1] as Shell;
    if (!(["bash", "zsh", "fish"] as string[]).includes(shell) || args.length !== 2) {
      throw new Error("usage: uaemcp completion <bash|zsh|fish>");
    }
    return { command: "completion", shell };
  }
  if (args[0] === "http") {
    let host: string | undefined;
    let port: number | undefined;
    for (let index = 1; index < args.length; index += 1) {
      const option = args[index];
      const value = args[index + 1];
      if (option === "--host" && value) {
        host = value;
        index += 1;
      } else if (option === "--port" && value) {
        port = Number(value);
        index += 1;
      } else {
        throw new Error(`unknown option: ${option}`);
      }
    }
    if (host !== undefined && !host.trim()) throw new Error("invalid --host");
    if (port !== undefined && (!Number.isInteger(port) || port <= 0 || port > 65_535)) throw new Error("invalid --port");
    return { command: "http", host, port };
  }
  throw new Error(`unknown command: ${args[0]}`);
}

export function helpText(): string {
  return `Open Emirates Intelligence

Usage:
  uaemcp [stdio]                       Start the MCP stdio server (default)
  uaemcp http [--host HOST] [--port N] Start MCP, REST and website over HTTP
  uaemcp doctor [--json]               Check runtime and deployment safety
  uaemcp completion <bash|zsh|fish>    Print shell completion
  uaemcp version                       Print the package version
  uaemcp help                          Show this help

Examples:
  uaemcp http --host 0.0.0.0 --port 8080
  source <(uaemcp completion zsh)`;
}

export function completionScript(shell: Shell): string {
  const words = "stdio http doctor completion version help";
  if (shell === "zsh") return `#compdef uaemcp\n_arguments '1:command:(${words})' '*::arg:->args'`;
  if (shell === "fish") return words.split(" ").map((word) => `complete -c uaemcp -f -a '${word}'`).join("\n");
  return `_uaemcp(){ COMPREPLY=( $(compgen -W '${words}' -- "\${COMP_WORDS[1]}") ); }\ncomplete -F _uaemcp uaemcp`;
}

export function doctorReport(input = {
  bunVersion: Bun.version,
  writeToken: SETTINGS.writeToken,
  databasePath: SETTINGS.databasePath,
  allowedHosts: SETTINGS.allowedHosts,
  allowedOrigins: SETTINGS.allowedOrigins,
}): { ok: boolean; checks: DoctorCheck[] } {
  const [major, minor] = input.bunVersion.split(".").map(Number);
  const runtimeOk = major > 1 || (major === 1 && minor >= 3);
  const checks: DoctorCheck[] = [
    { id: "runtime", status: runtimeOk ? "pass" : "fail", message: `Bun ${input.bunVersion}; version 1.3+ is required` },
    { id: "database", status: input.databasePath ? "pass" : "fail", message: input.databasePath ? `SQLite path: ${input.databasePath}` : "UAEMCP_DATABASE_PATH is empty" },
    { id: "writes", status: input.writeToken ? "warn" : "pass", message: input.writeToken ? "Write tools are enabled; protect the token and endpoint" : "Write tools are safely disabled" },
    { id: "hosts", status: input.allowedHosts.length ? "pass" : "warn", message: input.allowedHosts.length ? "Public Host allowlist configured" : "UAEMCP_ALLOWED_HOSTS is not set" },
    { id: "origins", status: input.allowedOrigins.length ? "pass" : "warn", message: input.allowedOrigins.length ? "Browser Origin allowlist configured" : "UAEMCP_ALLOWED_ORIGINS is not set" },
  ];
  return { ok: checks.every((check) => check.status !== "fail"), checks };
}

export function formatDoctor(report: ReturnType<typeof doctorReport>): string {
  const symbols = { pass: "PASS", warn: "WARN", fail: "FAIL" } as const;
  return [...report.checks.map((check) => `${symbols[check.status]}  ${check.message}`), report.ok ? "READY with warnings shown above" : "NOT READY"].join("\n");
}
