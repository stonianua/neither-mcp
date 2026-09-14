#!/usr/bin/env node
/**
 * Assert Gemini CLI 0.59 github-release install would unpack a Neither
 * extension (gemini-extension.json at archive root, stdio npx, sensitive
 * NEITHER_API_KEY) without treating the Claude Desktop `.mcpb` as the
 * extension tree.
 *
 * Does not run Gemini CLI, publish npm, or print API keys.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GEMINI_EXTENSION_ARCHIVE_NAMES,
  assertExtractableArchiveName,
  findReleaseAsset,
} from "./lib/gemini-cli-0.59-release-asset.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MCPB_NAME = "neither-mcp-0.1.2.mcpb";

/** Operator fixture 2026-09-14: latest GitHub Release v0.1.2 sole custom asset. */
const BROKEN_RELEASE_ASSETS = [{ name: MCPB_NAME }];

const tempDirs = [];

function mkTemp(prefix) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function fail(message) {
  throw new Error(message);
}

function assert(cond, message) {
  if (!cond) fail(message);
}

function extractTarGz(archive, dest) {
  mkdirSync(dest, { recursive: true });
  execFileSync("tar", ["-xzf", archive, "-C", dest], { stdio: "pipe" });
}

function extractZip(archive, dest) {
  mkdirSync(dest, { recursive: true });
  execFileSync(
    "python3",
    [
      "-c",
      "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])",
      archive,
      dest,
    ],
    { stdio: "pipe" },
  );
}

function readExtensionAt(dir) {
  const manifestPath = path.join(dir, "gemini-extension.json");
  if (!existsSync(manifestPath)) {
    fail(`missing gemini-extension.json in ${dir}`);
  }
  if (!existsSync(path.join(dir, "GEMINI.md"))) {
    fail(`missing GEMINI.md in ${dir}`);
  }
  const config = JSON.parse(readFileSync(manifestPath, "utf8"));
  const server = config?.mcpServers?.neither;
  if (!server) fail("gemini-extension.json missing mcpServers.neither");
  if (server.command !== "npx") {
    fail(`expected stdio command npx, got ${server.command}`);
  }
  const args = Array.isArray(server.args) ? server.args : [];
  if (!args.includes("-y") || !args.some((a) => String(a).startsWith("@neitherai/mcp-server"))) {
    fail(`expected npx -y @neitherai/mcp-server…, got ${JSON.stringify(args)}`);
  }
  const keySetting = (config.settings ?? []).find((s) => s.envVar === "NEITHER_API_KEY");
  if (!keySetting || keySetting.sensitive !== true) {
    fail("NEITHER_API_KEY must be a sensitive setting");
  }
  if (server.env?.NEITHER_API_KEY !== "${NEITHER_API_KEY}") {
    fail("mcpServers.neither.env.NEITHER_API_KEY must be ${NEITHER_API_KEY}");
  }
  return config;
}

function pack() {
  execFileSync("bash", [path.join(ROOT, "scripts/pack-gemini-extension.sh")], {
    cwd: ROOT,
    stdio: "pipe",
  });
}

function testFindReleaseAssetPicksMcpbWhenItIsTheOnlyAsset() {
  const picked = findReleaseAsset(BROKEN_RELEASE_ASSETS, {
    platform: "linux",
    arch: "x64",
  });
  assert(picked?.name === MCPB_NAME, `expected sole .mcpb to be selected, got ${picked?.name}`);
  let extractError = null;
  try {
    assertExtractableArchiveName(picked.name);
  } catch (e) {
    extractError = e;
  }
  assert(extractError, "0.59 must refuse to extract .mcpb");
  assert(
    /Unsupported file extension/.test(String(extractError.message)),
    `unexpected extract error: ${extractError.message}`,
  );
  console.log("PASS: sole GitHub Release .mcpb is selected and is not extractable (0.59)");
}

function testCloneIntoDirtyTempFails() {
  const dest = mkTemp("neither-gemini-dirty-");
  writeFileSync(path.join(dest, MCPB_NAME), "not-an-archive");
  let cloneError = null;
  try {
    execFileSync("git", ["clone", "--depth", "1", ROOT, "./"], {
      cwd: dest,
      stdio: "pipe",
    });
  } catch (e) {
    cloneError = e;
  }
  assert(cloneError, "git clone into a non-empty temp dir should fail");
  const stderr = `${cloneError.stderr ?? ""}${cloneError.message ?? ""}`;
  assert(
    /already exists and is not an empty directory/i.test(stderr) ||
      /destination path '.' already exists/i.test(stderr),
    `expected dirty-temp clone error, got: ${stderr}`,
  );
  console.log("PASS: git clone into non-empty github-release temp fails (0.59 fallback)");
}

function testPackedArchivesAreExtractableExtensions() {
  for (const name of GEMINI_EXTENSION_ARCHIVE_NAMES) {
    const archive = path.join(ROOT, name);
    assert(existsSync(archive), `missing packed archive ${name}; pack first`);
    assertExtractableArchiveName(name);
    const dest = mkTemp(`neither-gemini-extract-${name}-`);
    if (name.endsWith(".zip")) {
      extractZip(archive, dest);
    } else {
      extractTarGz(archive, dest);
    }
    readExtensionAt(dest);
    assert(
      !existsSync(path.join(dest, "manifest.json")),
      `${name} must not be a Claude MCPB tree`,
    );
  }
  console.log("PASS: packed Gemini archives extract with gemini-extension.json at root");
}

function testPlatformAssetsWinOverMcpb() {
  const assets = [
    { name: MCPB_NAME },
    ...GEMINI_EXTENSION_ARCHIVE_NAMES.map((name) => ({ name })),
  ];
  const cases = [
    { platform: "linux", arch: "x64", expected: "linux.neither-mcp.tar.gz" },
    { platform: "linux", arch: "arm64", expected: "linux.neither-mcp.tar.gz" },
    { platform: "darwin", arch: "arm64", expected: "darwin.neither-mcp.tar.gz" },
    { platform: "darwin", arch: "x64", expected: "darwin.neither-mcp.tar.gz" },
    { platform: "win32", arch: "x64", expected: "win32.neither-mcp.zip" },
  ];
  for (const { platform, arch, expected } of cases) {
    const picked = findReleaseAsset(assets, { platform, arch });
    assert(
      picked?.name === expected,
      `0.59 ${platform}.${arch} should pick ${expected}, got ${picked?.name}`,
    );
    assertExtractableArchiveName(picked.name);
  }

  const mcpbPlusGenericZip = [
    { name: MCPB_NAME },
    { name: "neither-mcp.tar.gz" },
  ];
  const genericPick = findReleaseAsset(mcpbPlusGenericZip, {
    platform: "linux",
    arch: "x64",
  });
  assert(
    genericPick === undefined,
    "two generic assets must not select the .mcpb (0.59 would use the source tarball instead)",
  );
  console.log("PASS: platform-prefixed Gemini archives beat the Claude .mcpb on 0.59");
}

function testRepoRootManifest() {
  readExtensionAt(ROOT);
  console.log("PASS: repo-root gemini-extension.json is a valid local-path extension");
}

function main() {
  testRepoRootManifest();
  testFindReleaseAssetPicksMcpbWhenItIsTheOnlyAsset();
  testCloneIntoDirtyTempFails();
  pack();
  testPackedArchivesAreExtractableExtensions();
  testPlatformAssetsWinOverMcpb();
}

let failed = false;
try {
  main();
  console.log("All Gemini extension pack checks passed.");
} catch (e) {
  failed = true;
  console.error(e instanceof Error ? e.message : String(e));
} finally {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

process.exit(failed ? 1 : 0);
