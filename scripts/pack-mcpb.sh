#!/usr/bin/env bash
# Pack Neither as a Claude Desktop MCPB (.mcpb).
# Vendors production node_modules so Claude Desktop can spawn `node` (not npx).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MCPB_DIR="${ROOT}/mcpb"
SERVER_PKG="${ROOT}/packages/mcp-server"

if [[ ! -d "${SERVER_PKG}/node_modules" ]]; then
  (cd "${SERVER_PKG}" && npm install)
fi
(cd "${SERVER_PKG}" && npm run build)

# --install-links packs file: deps into node_modules (no symlink into ../packages).
rm -rf "${MCPB_DIR}/node_modules"
(cd "${MCPB_DIR}" && npm install --omit=dev --install-links=true --no-package-lock)

BUNDLED="${MCPB_DIR}/node_modules/@neitherai/mcp-server"
if [[ -L "${BUNDLED}" ]]; then
  echo "error: ${BUNDLED} is a symlink; the .mcpb would not contain the server" >&2
  exit 1
fi
if [[ ! -f "${BUNDLED}/dist/index.js" ]]; then
  echo "error: missing ${BUNDLED}/dist/index.js — build packages/mcp-server first" >&2
  exit 1
fi

VERSION="$(python3 -c 'import json; print(json.load(open("'"${MCPB_DIR}"'/manifest.json"))["version"])')"
OUT="${ROOT}/neither-mcp-${VERSION}.mcpb"

npx -y @anthropic-ai/mcpb validate "${MCPB_DIR}/manifest.json"
npx -y @anthropic-ai/mcpb pack "${MCPB_DIR}" "${OUT}"
echo "Wrote ${OUT}"
