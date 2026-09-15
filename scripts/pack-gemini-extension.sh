#!/usr/bin/env bash
# Pack Gemini CLI github-release archives (gemini-extension.json at archive root).
#
# Gemini CLI 0.59 treats `gemini extensions install https://github.com/OWNER/REPO`
# as a github-release install. It only extracts `.tar.gz` / `.zip`. When the
# latest GitHub Release's only custom asset is the Claude Desktop `.mcpb`,
# 0.59 downloads that file, fails to extract it, then `git clone` into the
# same non-empty temp dir fails.
#
# Platform-prefixed archives (`linux.` / `darwin.` / `win32.`) are selected
# instead of the `.mcpb` even though the extension is platform-independent
# (stdio via npx). Keep attaching `neither-mcp-*.mcpb` on the same release
# for Claude Desktop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

for f in gemini-extension.json GEMINI.md; do
  if [[ ! -f "${f}" ]]; then
    echo "error: missing ${f} at repo root" >&2
    exit 1
  fi
done

if ! command -v tar >/dev/null; then
  echo "error: tar is required" >&2
  exit 1
fi
if ! command -v zip >/dev/null; then
  echo "error: zip is required" >&2
  exit 1
fi

STAGE="$(mktemp -d)"
cleanup() { rm -rf "${STAGE}"; }
trap cleanup EXIT

cp gemini-extension.json GEMINI.md "${STAGE}/"

# Files at archive root — Gemini docs require gemini-extension.json there.
tar -C "${STAGE}" -czf "${ROOT}/darwin.neither-mcp.tar.gz" gemini-extension.json GEMINI.md
tar -C "${STAGE}" -czf "${ROOT}/linux.neither-mcp.tar.gz" gemini-extension.json GEMINI.md
(cd "${STAGE}" && zip -q "${ROOT}/win32.neither-mcp.zip" gemini-extension.json GEMINI.md)

echo "Wrote ${ROOT}/darwin.neither-mcp.tar.gz"
echo "Wrote ${ROOT}/linux.neither-mcp.tar.gz"
echo "Wrote ${ROOT}/win32.neither-mcp.zip"
