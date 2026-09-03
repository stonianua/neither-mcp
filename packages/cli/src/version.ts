import pkg from "../package.json";

/** Package version from package.json — used in CLI --version and User-Agent headers. */
export const NEITHER_CLI_VERSION = pkg.version;
