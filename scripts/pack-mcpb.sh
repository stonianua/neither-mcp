#!/usr/bin/env bash
# Pack Neither MCPB. Does not vendor node_modules; spawn is npx @neitherai/mcp-server@latest.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(python3 -c 'import json; print(json.load(open("'"$ROOT"'/mcpb/manifest.json"))["version"])')"
OUT="${ROOT}/neither-mcp-${VERSION}.mcpb"

npx -y @anthropic-ai/mcpb validate "${ROOT}/mcpb/manifest.json"
npx -y @anthropic-ai/mcpb pack "${ROOT}/mcpb" "${OUT}"
echo "Wrote ${OUT}"
