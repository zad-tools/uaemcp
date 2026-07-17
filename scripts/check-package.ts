const result = Bun.spawnSync({
  cmd: ["npm", "pack", "--dry-run", "--json", "--ignore-scripts"],
  stdout: "pipe",
  stderr: "pipe",
});

if (result.exitCode !== 0) {
  throw new Error(new TextDecoder().decode(result.stderr).trim() || "npm pack dry-run failed");
}

const [report] = JSON.parse(new TextDecoder().decode(result.stdout)) as Array<{
  filename: string;
  size: number;
  unpackedSize: number;
  files: Array<{ path: string; size: number }>;
}>;

if (!report) throw new Error("npm pack returned no package report");

const visualAssets = report.files.filter(({ path }) => path.startsWith("docs/assets/"));
if (visualAssets.length) {
  throw new Error(`Release package includes ${visualAssets.length} documentation visuals`);
}

const maximumPackedBytes = 1_000_000;
if (report.size > maximumPackedBytes) {
  throw new Error(`Release package is ${report.size} bytes; maximum is ${maximumPackedBytes}`);
}

const requiredFiles = [
  "package.json",
  "README.md",
  "src/index.ts",
  "docs/API.md",
  "docs/MCP_TOOLS.md",
  "docs/mcp-tools.json",
];
const packedPaths = new Set(report.files.map(({ path }) => path));
const missing = requiredFiles.filter((path) => !packedPaths.has(path));
if (missing.length) throw new Error(`Release package is missing: ${missing.join(", ")}`);

console.log(`${report.filename}: ${report.files.length} files, ${report.size} packed bytes, ${report.unpackedSize} unpacked bytes`);
