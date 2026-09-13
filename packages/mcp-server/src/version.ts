import { readFileSync } from "node:fs";

type PackageJson = {
  name: string;
  version: string;
  mcpName?: string;
};

/** Used only if package.json is missing next to dist/ (some registry image layouts). */
const FALLBACK_PACKAGE_JSON: PackageJson = {
  name: "@neitherai/mcp-server",
  version: "0.1.2",
  mcpName: "io.github.stonianua/neither-mcp",
};

function readPackageJson(): PackageJson {
  try {
    return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as PackageJson;
  } catch {
    return FALLBACK_PACKAGE_JSON;
  }
}

const pkg = readPackageJson();

/** Package version from package.json — used in MCP server metadata and User-Agent headers. */
export const NEITHER_MCP_SERVER_VERSION = pkg.version;

/** npm package name from package.json — used in MCP Server constructor metadata. */
export const NEITHER_MCP_SERVER_PACKAGE_NAME = pkg.name;

/** MCP Registry name from package.json mcpName — must match server.json name. */
export const NEITHER_MCP_REGISTRY_NAME = pkg.mcpName;
