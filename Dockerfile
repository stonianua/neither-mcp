# Glama (and similar hosts) build this image, start the process, and send MCP
# initialize + tools/list over stdio. ENTRYPOINT is the local server binary.
#
# Build context may be the repository root (monorepo) or packages/mcp-server.
# If neither layout is present, install the published stdio package so an
# empty/shallow context still produces a runnable image.
#
# NEITHER_API_KEY is required at process start (packages/mcp-server/src/config.ts).
# tools/list does not call the API, so a placeholder is enough to boot for
# introspection. Real clients override it via the MCP env.

FROM node:20-slim AS build
WORKDIR /app
COPY . /context
RUN set -eu; \
  if [ -f /context/packages/mcp-server/package.json ]; then \
    src=/context/packages/mcp-server; \
  elif [ -f /context/package.json ]; then \
    src=/context; \
  else \
    src=; \
  fi; \
  if [ -n "$src" ]; then \
    cp -a "$src"/. /app/; \
    npm install --no-audit --no-fund; \
    npm run build; \
    npm prune --omit=dev; \
  else \
    npm install --no-audit --no-fund @neitherai/mcp-server@0.1.2; \
    cp -a /app/node_modules/@neitherai/mcp-server/. /tmp/pkg/; \
    rm -rf /app/node_modules /app/package.json /app/package-lock.json; \
    cp -a /tmp/pkg/. /app/; \
    npm install --omit=dev --no-audit --no-fund; \
  fi

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Default a placeholder key at process start (not an ENV instruction — BuildKit
# flags ENV *KEY* as a secret). tools/list does not call the API. Real clients
# override NEITHER_API_KEY in the MCP env.
RUN printf '%s\n' \
  '#!/bin/sh' \
  'export NEITHER_API_KEY="${NEITHER_API_KEY:-placeholder}"' \
  'exec node /app/dist/index.js "$@"' \
  > /usr/local/bin/neither-mcp-stdio \
  && chmod 755 /usr/local/bin/neither-mcp-stdio
USER node
ENTRYPOINT ["neither-mcp-stdio"]
