# Glama (and similar hosts) build this image, start the process, and send MCP
# initialize + tools/list over stdio. CMD is the local server binary — not a
# remote HTTP URL (Glama rejects CMDs that point at external URLs).
#
# NEITHER_API_KEY is required at process start (see packages/mcp-server/src/config.ts).
# tools/list does not call the API, so a placeholder is enough to boot for
# introspection. Real clients override it via the MCP env.

FROM node:20-alpine AS build
WORKDIR /app
COPY packages/mcp-server/package.json packages/mcp-server/tsconfig.json ./
COPY packages/mcp-server/src ./src
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Placeholder for registry introspection; override with a real workspace key.
ENV NEITHER_API_KEY=placeholder
COPY packages/mcp-server/package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
