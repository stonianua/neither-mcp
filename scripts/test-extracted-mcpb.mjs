#!/usr/bin/env node
/**
 * Clean-room first-use test of a packed Neither `.mcpb`.
 *
 * Installation-friction coverage for the existing pack path — not a second
 * packaging system. Extracts the artifact outside the checkout, launches the
 * manifest entry point with Node 20+ (no repo node_modules, NODE_PATH, npm,
 * npx, or package download), then speaks MCP stdio JSON-RPC:
 * initialize → notifications/initialized → tools/list.
 *
 * Placeholder-key initialize is protocol-only and is never counted as
 * authentication. Authenticated retrieval runs only when a non-fork CI
 * secret looks like a workspace key (sk_ctx_*).
 */
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import os from "node:os";
import path from "node:path";

const PLACEHOLDER_KEY = "placeholder";
const EXPECTED_TOOLS = [
  "memory_search",
  "memory_for_file",
  "memory_snippet_fetch",
  "memory_timeline",
  "memory_push",
];
const PROTOCOL_VERSION = "2025-03-26";
const CONFIG_KEY_RE = /NEITHER_API_KEY|api key|user_config/i;
const AUTH_FAIL_RE =
  /invalid_or_missing_bearer|unauthorized|invalid api key|401\b|forbidden|missing_bearer/i;

const report = {
  artifact: null,
  sha256: null,
  bytes: null,
  extractDir: null,
  node: process.version,
  nodePathUnset: true,
  npmNpxInvoked: false,
  startup: "NOT RUN",
  toolsList: "NOT RUN",
  tools: [],
  missingKey: "NOT RUN",
  missingKeyDetail: "",
  auth: "NOT TESTED",
  authDetail: "no already-authorized synthetic workspace credential in CI secrets",
  sourceEvidence: "NOT TESTED",
};

const tempDirs = [];

function parseArgs(argv) {
  const out = { mcpb: null, checkout: process.cwd() };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--mcpb") {
      out.mcpb = argv[i + 1];
      i += 1;
    } else if (a === "--checkout") {
      out.checkout = argv[i + 1];
      i += 1;
    } else if (!a.startsWith("-") && !out.mcpb) {
      out.mcpb = a;
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  return out;
}

function findMcpb(cwd) {
  const names = readdirSync(cwd).filter((n) => /^neither-mcp-.*\.mcpb$/u.test(n));
  if (names.length === 1) return path.join(cwd, names[0]);
  if (names.length === 0) {
    throw new Error(`no neither-mcp-*.mcpb in ${cwd}; pack first (bash scripts/pack-mcpb.sh)`);
  }
  throw new Error(`expected exactly one .mcpb, found: ${names.join(", ")}`);
}

function sha256File(file) {
  const hash = createHash("sha256");
  const data = readFileSync(file);
  hash.update(data);
  return { hex: hash.digest("hex"), bytes: data.length };
}

function isInside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel));
}

function isForkPullRequest() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return false;
  try {
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    return Boolean(event.pull_request?.head?.repo?.fork);
  } catch {
    return false;
  }
}

function isUsableWorkspaceKey(value) {
  const key = (value ?? "").trim();
  if (!key) return false;
  if (/^(placeholder|changeme|dummy|test|your-key-here)$/i.test(key)) return false;
  if (key.includes("…") || key.includes("...")) return false;
  if (!key.startsWith("sk_ctx_")) return false;
  return key.length >= 20;
}

function pickSyntheticKey() {
  if (isForkPullRequest()) {
    report.authDetail = "fork PR — secrets not used";
    return null;
  }
  const candidates = [
    process.env.NEITHER_MCPB_TEST_API_KEY,
    process.env.NEITHER_SYNTHETIC_API_KEY,
    process.env.NEITHER_API_KEY,
  ];
  for (const c of candidates) {
    if (isUsableWorkspaceKey(c)) return c.trim();
  }
  if (candidates.some((c) => (c ?? "").trim())) {
    report.authDetail =
      "CI secret present but not a usable workspace key (sk_ctx_*); not counted as authentication";
  }
  return null;
}

function redact(value) {
  return String(value ?? "").replace(/sk_ctx_[A-Za-z0-9._-]+/g, "sk_ctx_[redacted]");
}

function mkTemp(prefix) {
  const dir = mkdtempSync(path.join("/tmp", prefix));
  tempDirs.push(dir);
  return dir;
}

function extractMcpb(mcpbPath, dest) {
  mkdirSync(dest, { recursive: true });
  execFileSync(
    "python3",
    [
      "-c",
      "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])",
      mcpbPath,
      dest,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

function makeLaunchPath(nodeBin, invokedFlag) {
  const stubs = mkTemp("neither-mcpb-stubs-");
  const nodeDir = mkTemp("neither-mcpb-nodebin-");
  symlinkSync(nodeBin, path.join(nodeDir, "node"));
  const stub = `#!/bin/sh
echo "$0" >> "${invokedFlag}"
echo "blocked: $0 is disabled during extracted MCPB first-use test" >&2
exit 127
`;
  for (const name of ["npm", "npx", "yarn", "pnpm", "corepack"]) {
    const p = path.join(stubs, name);
    writeFileSync(p, stub);
    chmodSync(p, 0o755);
  }
  return `${stubs}:${nodeDir}:/usr/bin:/bin`;
}

function childEnv({ extra = {}, invokedFlag }) {
  const home = mkTemp("neither-mcpb-home-");
  const env = {
    PATH: makeLaunchPath(process.execPath, invokedFlag),
    HOME: home,
    TMPDIR: os.tmpdir(),
    LANG: process.env.LANG || "C.UTF-8",
    LC_ALL: process.env.LC_ALL || "C.UTF-8",
    ...extra,
  };
  if ("NODE_PATH" in env) {
    throw new Error("internal error: NODE_PATH must not be set on the extracted server");
  }
  return env;
}

class McpStdioClient {
  constructor(child) {
    this.child = child;
    this.pending = new Map();
    this.messages = [];
    this.stderr = "";
    this.exit = null;
    child.stderr.on("data", (d) => {
      this.stderr += d.toString("utf8");
    });
    child.stdin.on("error", () => {
      /* EPIPE when the server exits before handshake (missing-key path). */
    });
    this.rl = createInterface({ input: child.stdout });
    this.rl.on("line", (line) => {
      if (!line.trim()) return;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch (e) {
        const err = new Error(`non-JSON MCP stdout: ${redact(line.slice(0, 200))}: ${e}`);
        for (const [, p] of this.pending) p.reject(err);
        this.pending.clear();
        return;
      }
      this.messages.push(msg);
      if (msg.id != null && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p.resolve(msg);
      }
    });
    this.exitPromise = new Promise((resolve) => {
      child.on("exit", (code, signal) => {
        this.exit = { code, signal };
        resolve(this.exit);
      });
    });
  }

  send(obj) {
    this.child.stdin.write(`${JSON.stringify(obj)}\n`);
  }

  rpc(id, method, params, timeoutMs) {
    this.send({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `timeout waiting for ${method} (${timeoutMs}ms); stderr=${redact(this.stderr)}`,
          ),
        );
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (msg) => {
          clearTimeout(t);
          resolve(msg);
        },
        reject: (err) => {
          clearTimeout(t);
          reject(err);
        },
      });
    });
  }

  notify(method, params) {
    this.send({ jsonrpc: "2.0", method, params });
  }

  async close() {
    for (const [, p] of this.pending) {
      p.reject(new Error("client closed"));
    }
    this.pending.clear();
    try {
      this.child.stdin.end();
    } catch {
      /* ignore */
    }
    this.child.kill("SIGTERM");
    const killer = setTimeout(() => this.child.kill("SIGKILL"), 2000);
    await this.exitPromise.catch(() => undefined);
    clearTimeout(killer);
    this.rl.close();
  }
}

function spawnExtracted(extractRoot, entry, env) {
  const child = spawn(process.execPath, [entry], {
    cwd: extractRoot,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  return new McpStdioClient(child);
}

async function expectMissingKey(extractRoot, entry, invokedFlag, extra = {}) {
  const env = childEnv({ invokedFlag, extra });
  const client = spawnExtracted(extractRoot, entry, env);
  let initialized = false;
  try {
    const raced = await Promise.race([
      client.exitPromise.then((exit) => ({ type: "exit", exit })),
      client
        .rpc(
          1,
          "initialize",
          {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "neither-mcpb-first-use", version: "0.0.0" },
          },
          4000,
        )
        .then((msg) => ({ type: "init", msg }))
        .catch((err) => ({ type: "init-error", err })),
    ]);
    if (raced.type === "init" && raced.msg?.result?.serverInfo) {
      initialized = true;
    }
    if (!client.exit) {
      await Promise.race([
        client.exitPromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  } finally {
    await client.close();
  }
  const stderr = redact(client.stderr.trim());
  const exitCode = client.exit?.code;
  if (initialized) {
    throw new Error(
      `missing-key path initialized successfully (misleading success); stderr=${stderr || "(empty)"}`,
    );
  }
  if (exitCode === 0) {
    throw new Error(`missing-key path exited 0; stderr=${stderr || "(empty)"}`);
  }
  if (!CONFIG_KEY_RE.test(client.stderr)) {
    throw new Error(
      `missing-key path did not mention NEITHER_API_KEY (unexplained crash); exit=${exitCode} stderr=${stderr || "(empty)"}`,
    );
  }
  return {
    exitCode: exitCode ?? 1,
    stderr,
  };
}

function assertProtocolMessage(msg, method) {
  if (msg.error) {
    throw new Error(`${method} JSON-RPC error: ${redact(JSON.stringify(msg.error))}`);
  }
  if (!msg.result || typeof msg.result !== "object") {
    throw new Error(`${method} missing result object: ${redact(JSON.stringify(msg))}`);
  }
  return msg.result;
}

async function runProtocol(extractRoot, entry, invokedFlag) {
  const env = childEnv({
    invokedFlag,
    extra: { NEITHER_API_KEY: PLACEHOLDER_KEY },
  });
  const client = spawnExtracted(extractRoot, entry, env);
  try {
    const initMsg = await client.rpc(
      1,
      "initialize",
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "neither-mcpb-first-use", version: "0.0.0" },
      },
      8000,
    );
    const init = assertProtocolMessage(initMsg, "initialize");
    if (!init.protocolVersion) {
      throw new Error("initialize result missing protocolVersion");
    }
    if (!init.serverInfo?.name) {
      throw new Error("initialize result missing serverInfo.name");
    }
    client.notify("notifications/initialized");
    const listedMsg = await client.rpc(2, "tools/list", {}, 8000);
    const listed = assertProtocolMessage(listedMsg, "tools/list");
    const names = (listed.tools ?? []).map((t) => t.name);
    const missing = EXPECTED_TOOLS.filter((n) => !names.includes(n));
    const extra = names.filter((n) => !EXPECTED_TOOLS.includes(n));
    if (missing.length || extra.length || names.length !== EXPECTED_TOOLS.length) {
      throw new Error(
        `tools/list mismatch: got [${names.join(", ")}] expected [${EXPECTED_TOOLS.join(", ")}]`,
      );
    }
    return {
      protocolVersion: init.protocolVersion,
      serverInfo: init.serverInfo,
      tools: names,
    };
  } finally {
    await client.close();
  }
}

function inspectSourceEvidence(callMsg) {
  const result = callMsg.result ?? {};
  const isError = result.isError === true;
  const text = Array.isArray(result.content)
    ? result.content
        .filter((c) => c && c.type === "text")
        .map((c) => c.text)
        .join("\n")
    : "";
  const structured = result.structuredContent;
  const results = Array.isArray(structured?.results) ? structured.results : [];
  const sourceIds = new Set();
  for (const row of results) {
    const prov = row?.provenance && typeof row.provenance === "object" ? row.provenance : {};
    for (const candidate of [
      row?.source_id,
      row?.source_document_id,
      prov.source_document_id,
      prov.source_id,
    ]) {
      if (typeof candidate === "string" && candidate.trim()) sourceIds.add(candidate.trim());
    }
  }
  if (typeof structured?.source_document_id === "string" && structured.source_document_id.trim()) {
    sourceIds.add(structured.source_document_id.trim());
  }
  const hasDecisionProse = /\bDecision:|\bCitation:|\bRejected:|\bConstraint:/u.test(text);
  return {
    isError,
    errorText: isError ? redact(text).slice(0, 240) : "",
    hitCount: results.length,
    sourceIdCount: sourceIds.size,
    hasDecisionProse,
    hasEvidence: sourceIds.size > 0 || hasDecisionProse,
  };
}

async function runAuthenticatedRetrieval(extractRoot, entry, invokedFlag, apiKey, apiBase) {
  const extra = { NEITHER_API_KEY: apiKey };
  if (apiBase) extra.NEITHER_API_BASE = apiBase;
  const env = childEnv({ invokedFlag, extra });
  const client = spawnExtracted(extractRoot, entry, env);
  try {
    const initMsg = await client.rpc(
      1,
      "initialize",
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "neither-mcpb-first-use", version: "0.0.0" },
      },
      8000,
    );
    assertProtocolMessage(initMsg, "initialize");
    client.notify("notifications/initialized");
    const callMsg = await client.rpc(
      3,
      "tools/call",
      { name: "memory_search", arguments: { query: "decision", maxResults: 5 } },
      20000,
    );
    if (callMsg.error) {
      throw new Error(`tools/call JSON-RPC error: ${redact(JSON.stringify(callMsg.error))}`);
    }
    const evidence = inspectSourceEvidence(callMsg);
    if (evidence.isError && AUTH_FAIL_RE.test(evidence.errorText)) {
      throw new Error(
        `authenticated retrieval failed (not a successful login): ${evidence.errorText || "isError"}`,
      );
    }
    if (evidence.isError) {
      return {
        status: "FAIL",
        detail: `memory_search returned isError: ${evidence.errorText || "(no text)"}`,
        evidence,
      };
    }
    return {
      status: "PASS",
      detail: evidence.hasEvidence
        ? `memory_search hitCount=${evidence.hitCount} sourceIds=${evidence.sourceIdCount} decisionProse=${evidence.hasDecisionProse}`
        : `memory_search authenticated (0 hits; no source evidence in this workspace)`,
      evidence,
    };
  } finally {
    await client.close();
  }
}

function writeGithubOutput() {
  const md = [
    "## Extracted MCPB first-use",
    "",
    `| Check | Result |`,
    `| --- | --- |`,
    `| Artifact | \`${report.artifact}\` |`,
    `| SHA-256 | \`${report.sha256}\` |`,
    `| Size | ${report.bytes} bytes |`,
    `| Extract dir | \`${report.extractDir}\` (outside checkout) |`,
    `| Node | ${report.node} |`,
    `| NODE_PATH | unset |`,
    `| npm/npx during launch | ${report.npmNpxInvoked ? "INVOKED (fail)" : "not invoked"} |`,
    `| initialize + initialized | ${report.startup} |`,
    `| tools/list | ${report.toolsList} ${report.tools.length ? `(\`${report.tools.join("`, `")}\`)` : ""} |`,
    `| missing key | ${report.missingKey} ${report.missingKeyDetail} |`,
    `| authenticated retrieval | ${report.auth} |`,
    `| source evidence | ${report.sourceEvidence} |`,
    "",
    "Placeholder-key initialize / tools/list is protocol-only and is **not** counted as authentication.",
    report.authDetail ? `\nAuth note: ${report.authDetail}` : "",
  ].join("\n");

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    writeFileSync(summaryPath, `${md}\n`, { flag: "a" });
  }
  console.log(md);
  if (report.sha256 && process.env.GITHUB_ACTIONS === "true") {
    console.log(`::notice title=MCPB sha256::${report.sha256}`);
  }
}

function majorNodeVersion() {
  const m = /^v(\d+)/.exec(process.version);
  return m ? Number(m[1]) : 0;
}

async function main() {
  const args = parseArgs(process.argv);
  const checkout = path.resolve(args.checkout || process.env.GITHUB_WORKSPACE || process.cwd());
  const mcpbPath = path.resolve(args.mcpb || findMcpb(checkout));
  if (!existsSync(mcpbPath)) {
    throw new Error(`mcpb not found: ${mcpbPath}`);
  }

  if (majorNodeVersion() < 20) {
    throw new Error(`Node 20+ required, got ${process.version}`);
  }

  const { hex, bytes } = sha256File(mcpbPath);
  report.artifact = path.basename(mcpbPath);
  report.sha256 = hex;
  report.bytes = bytes;
  console.log(`MCPB_FILE=${report.artifact}`);
  console.log(`MCPB_SHA256=${hex}`);
  console.log(`MCPB_BYTES=${bytes}`);

  const syntheticKey = pickSyntheticKey();
  const apiBase = (process.env.NEITHER_API_BASE ?? "").trim();
  delete process.env.NEITHER_API_KEY;
  delete process.env.NEITHER_MCPB_TEST_API_KEY;
  delete process.env.NEITHER_SYNTHETIC_API_KEY;
  delete process.env.NEITHER_API_BASE;

  const extractRoot = mkTemp("neither-mcpb-extract-");
  if (isInside(checkout, extractRoot)) {
    throw new Error(`extract dir ${extractRoot} is inside checkout ${checkout}`);
  }
  report.extractDir = extractRoot;
  extractMcpb(mcpbPath, extractRoot);

  const manifest = JSON.parse(readFileSync(path.join(extractRoot, "manifest.json"), "utf8"));
  const entryRel = manifest?.server?.entry_point;
  if (!entryRel || entryRel.includes("..") || path.isAbsolute(entryRel)) {
    throw new Error(`refusing entry_point ${entryRel}`);
  }
  const keyName = Object.keys(manifest.user_config ?? {});
  if (!keyName.includes("NEITHER_API_KEY")) {
    throw new Error(`extracted manifest user_config missing NEITHER_API_KEY`);
  }
  const entry = path.join(extractRoot, entryRel);
  if (!existsSync(entry)) {
    throw new Error(`extracted entry point missing: ${entryRel}`);
  }
  const bundled = path.join(extractRoot, "node_modules/@neitherai/mcp-server");
  if (existsSync(bundled) && lstatSync(bundled).isSymbolicLink()) {
    throw new Error("extracted @neitherai/mcp-server is a symlink; bundle would not be self-contained");
  }
  if (!existsSync(path.join(bundled, "dist/index.js"))) {
    throw new Error("extracted bundle missing node_modules/@neitherai/mcp-server/dist/index.js");
  }

  const invokedFlag = path.join(mkTemp("neither-mcpb-invoked-"), "npm-npx.log");

  const missingUnset = await expectMissingKey(extractRoot, entry, invokedFlag);
  const missingEmpty = await expectMissingKey(extractRoot, entry, invokedFlag, {
    NEITHER_API_KEY: "",
  });
  report.missingKey = "PASS";
  report.missingKeyDetail = `(unset exit ${missingUnset.exitCode}; empty exit ${missingEmpty.exitCode}; ${missingUnset.stderr})`;

  const proto = await runProtocol(extractRoot, entry, invokedFlag);
  report.startup = `PASS (protocol ${proto.protocolVersion}; ${proto.serverInfo.name}@${proto.serverInfo.version}; placeholder key not counted as auth)`;
  report.toolsList = "PASS";
  report.tools = proto.tools;

  if (existsSync(invokedFlag) && readFileSync(invokedFlag, "utf8").trim()) {
    report.npmNpxInvoked = true;
    throw new Error(`npm/npx invoked during launch:\n${readFileSync(invokedFlag, "utf8")}`);
  }

  if (syntheticKey) {
    const auth = await runAuthenticatedRetrieval(
      extractRoot,
      entry,
      invokedFlag,
      syntheticKey,
      apiBase || undefined,
    );
    report.auth = auth.status;
    report.authDetail = auth.detail;
    report.sourceEvidence = auth.evidence?.hasEvidence
      ? `PASS (hits=${auth.evidence.hitCount}, sourceIds=${auth.evidence.sourceIdCount})`
      : "none in this workspace (authenticated empty)";
    if (auth.status !== "PASS") {
      throw new Error(auth.detail);
    }
  }
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  const message = e instanceof Error ? e.message : String(e);
  console.error(redact(message));
} finally {
  writeGithubOutput();
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

process.exit(failed ? 1 : 0);
