import pkg from "../package.json";

/** Package version from package.json — used in MCP server metadata and User-Agent headers. */
export const NEITHER_MCP_SERVER_VERSION = pkg.version;

/** npm package name from package.json — used in MCP Server constructor metadata. */
export const NEITHER_MCP_SERVER_PACKAGE_NAME = pkg.name;

/** MCP Registry name from package.json mcpName — must match server.json name. */
export const NEITHER_MCP_REGISTRY_NAME = pkg.mcpName as string;
