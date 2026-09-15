/**
 * Asset selection + extract rules from Gemini CLI 0.59.0
 * (`packages/cli/src/config/extensions/github.ts` `findReleaseAsset` /
 * `extractFile`). Kept as a fixture so we can assert github-release install
 * behavior without depending on the Gemini CLI package.
 *
 * 0.59 prefers `{platform}.{arch}.` then `{platform}.` prefixes. A generic
 * asset is used only when it is the *only* release asset. Otherwise the CLI
 * falls back to the GitHub source tarball. `extractFile` accepts only
 * `.tar.gz` and `.zip` — not `.mcpb`.
 */

/**
 * @param {{ name: string }[]} assets
 * @param {{ platform: string, arch: string }} osInfo
 * @returns {{ name: string } | undefined}
 */
export function findReleaseAsset(assets, { platform, arch }) {
  const platformArchPrefix = `${platform}.${arch}.`;
  const platformPrefix = `${platform}.`;

  const platformArchAsset = assets.find((asset) =>
    asset.name.toLowerCase().startsWith(platformArchPrefix),
  );
  if (platformArchAsset) {
    return platformArchAsset;
  }

  const platformAsset = assets.find((asset) =>
    asset.name.toLowerCase().startsWith(platformPrefix),
  );
  if (platformAsset) {
    return platformAsset;
  }

  const genericAsset = assets.find(
    (asset) =>
      !asset.name.toLowerCase().includes("darwin") &&
      !asset.name.toLowerCase().includes("linux") &&
      !asset.name.toLowerCase().includes("win32"),
  );
  if (assets.length === 1) {
    return genericAsset;
  }

  return undefined;
}

/**
 * Mirrors Gemini CLI 0.59 `extractFile` extension gating (throws before
 * unpack). Does not unpack.
 * @param {string} file
 */
export function assertExtractableArchiveName(file) {
  if (file.endsWith(".tar.gz") || file.endsWith(".zip")) {
    return;
  }
  throw new Error(`Unsupported file extension for extraction: ${file}`);
}

export const GEMINI_EXTENSION_ARCHIVE_NAMES = [
  "darwin.neither-mcp.tar.gz",
  "linux.neither-mcp.tar.gz",
  "win32.neither-mcp.zip",
];
