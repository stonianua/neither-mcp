#!/usr/bin/env node
"use strict";

/**
 * Fallback launcher if a host runs `node entry_point` instead of mcp_config.
 * Canonical spawn is still: npx -y @neitherai/mcp-server@latest
 * (see manifest.json server.mcp_config). Do not vendor node_modules here.
 */
const { spawn } = require("child_process");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["-y", "@neitherai/mcp-server@latest"], {
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

function forward(signal) {
  if (!child.pid) return;
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
}

process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));

child.on("error", (err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
