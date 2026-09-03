#!/usr/bin/env node
/**
 * Pre-commit secret scanner
 * Scans staged files for hardcoded credentials and blocks commit if found.
 * Bypass: SKIP_SECRET_SCAN=1
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { scanContentForSecrets } from "./lib/secret-scan-patterns.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

if (process.env.SKIP_SECRET_SCAN === "1") {
  console.log("[scan-secrets] SKIP_SECRET_SCAN=1 — skipping");
  process.exit(0);
}

const STAGED_FILES_CMD = "git diff --cached --name-only --diff-filter=ACMR";

function getStagedFiles() {
  try {
    const out = execSync(STAGED_FILES_CMD, { cwd: projectRoot, encoding: "utf-8" });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function scanFile(filePath) {
  const fullPath = join(projectRoot, filePath);
  if (!existsSync(fullPath)) return [];
  const content = readFileSync(fullPath, "utf-8");
  return scanContentForSecrets(content, filePath, { skipTestPaths: false }).map((f) => ({
    file: filePath,
    name: f.name,
    match: f.match,
    line: f.line,
  }));
}

function main() {
  const staged = getStagedFiles();
  const allFindings = [];

  for (const f of staged) {
    const findings = scanFile(f);
    allFindings.push(...findings);
  }

  if (allFindings.length > 0) {
    console.error("\n❌ SECRET SCAN FAILED — potential credentials in staged files:\n");
    for (const f of allFindings) {
      console.error(`   ${f.file}:${f.line} ${f.name} (${f.match})`);
    }
    console.error(
      "\n   Remove or replace with env vars. See .cursor/rules/credentials-management.mdc",
    );
    console.error("   Bypass (emergency only): SKIP_SECRET_SCAN=1\n");
    process.exit(1);
  }

  console.log("[scan-secrets] ✅ No secrets detected");
  process.exit(0);
}

main();
