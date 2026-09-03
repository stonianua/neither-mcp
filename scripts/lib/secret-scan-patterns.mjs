/**
 * Shared secret patterns for pre-commit (staged) and full-repo audits.
 * Keep PLACEHOLDER_PATTERNS in sync when adding SECRET_PATTERNS.
 */

export const PLACEHOLDER_PATTERNS = [
  /re_XXXX+/i,
  /re_\[REDACTED\]/i,
  /sk-proj-your-api-key/i,
  /sk-proj-XXXX/i,
  /your[-_]?(api[-_]?)?key/i,
  /\[PASSWORD\]/i,
  /\[REDACTED\]/i,
  /your[-_]?service[-_]?role[-_]?key/i,
  /your[-_]?anon[-_]?key/i,
  /eyJ\.\.\./i,
  /postgresql:\/\/[^:]+:\[.*\]@/,
  /ghp_[xX0-9]{20,}/i,
  /gho_[xX0-9]{20,}/i,
  /ghs_[xX0-9]{20,}/i,
  /AIzaSyXXXX/i,
  /sbp_[xX0-9a-f]{20,}/i,
  /xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/i,
  /TOKEN_ENCRYPTION_KEY\s*=\s*["']your[-_]/i,
  /TOKEN_ENCRYPTION_KEY\s*=\s*["']\[?REDACTED\]?/i,
  /sk-test-/i,
  /dummy-key-for-ci/i,
  /your-recall-api-key/i,
  /your-azure-ad-client-secret/i,
  /postgresql:\/\/postgres\.xxx/i,
  /postgresql:\/\/postgres\.<project-ref>/i,
  /postgresql:\/\/postgres\.your-project:password@/i,
];

/** @type {{ name: string, regex: RegExp }[]} */
export const SECRET_PATTERNS = [
  { name: "OpenAI API key", regex: /sk-proj-[a-zA-Z0-9_-]{20,}/ },
  {
    name: "Supabase JWT",
    regex: /eyJhbGciOiJIUzI1NiIs[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  },
  { name: "Resend API key", regex: /re_[A-Za-z0-9]{20,}/ },
  {
    name: "Postgres URL with password",
    regex: /postgresql:\/\/[^:]+:[^@\s]+@/,
  },
  {
    name: "Railway token (hardcoded)",
    regex:
      /RAILWAY_(?:API_)?TOKEN["\s=:]+["']?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}["']?/i,
  },
  {
    name: "Generic API key",
    regex: /(?:\bapi[_-]?key\b|\bapikey\b|\bsecret\b)[\s:=]+["']?[a-zA-Z0-9_\-]{24,}["']?/i,
  },
  { name: "Gemini API key", regex: /AIzaSy[a-zA-Z0-9_-]{33}/ },
  { name: "GitHub PAT (classic)", regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "GitHub OAuth token", regex: /gho_[a-zA-Z0-9]{36}/ },
  { name: "GitHub App token", regex: /ghs_[a-zA-Z0-9]{36}/ },
  { name: "Supabase access token (sbp_)", regex: /sbp_[a-f0-9]{40,}/i },
  { name: "Telegram bot token", regex: /\b[0-9]{8,10}:[A-Za-z0-9_-]{35}\b/ },
  {
    name: "PEM private key block",
    regex: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/,
  },
  { name: "AWS access key id", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "TOKEN_ENCRYPTION_KEY value",
    regex: /TOKEN_ENCRYPTION_KEY\s*=\s*["']([A-Za-z0-9+/=]{32,})["']/,
  },
];

/**
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikePlaceholder(value) {
  const v = String(value);
  return PLACEHOLDER_PATTERNS.some((p) => p.test(v));
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function isEnvExampleFile(filePath) {
  return /\.env\.example$/i.test(filePath) || /\.env\..*\.example$/i.test(filePath);
}

/**
 * Skip obvious test doubles / CI mocks (not exhaustive; extend as needed).
 * @param {string} filePath
 * @returns {boolean}
 */
export function isLikelyTestOrCiMockPath(filePath) {
  const p = filePath.replace(/\\/g, "/");
  if (p.includes("/tests/") || p.includes("/__tests__/")) return true;
  if (p.startsWith("tests/")) return true;
  if (p.includes(".github/workflows/")) return true;
  if (p.endsWith("tests/setupTests.ts")) return true;
  return false;
}

/**
 * Railway UUID placeholders in example env files.
 * @param {string} match
 * @returns {boolean}
 */
export function isRailwayTokenPlaceholder(match) {
  return (
    /xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/i.test(match) ||
    /00000000-0000-0000-0000-000000000000/i.test(match)
  );
}

/**
 * @param {string} match
 * @returns {boolean}
 */
export function isPostgresUrlDocPlaceholder(match) {
  if (/<[^>@\s]+>/.test(match)) return true;
  if (/:\.{3}/.test(match)) return true;
  if (/postgres\.xxx/i.test(match)) return true;
  if (/:<password>/i.test(match)) return true;
  if (/your-project:password@/i.test(match)) return true;
  if (/postgres\.<project-ref>/i.test(match)) return true;
  return false;
}

/**
 * @param {string} content
 * @param {string} filePath
 * @param {{ skipTestPaths?: boolean }} [opts]
 * @returns {{ name: string, match: string, line: number }[]}
 */
export function scanContentForSecrets(content, filePath, opts = {}) {
  const { skipTestPaths = false } = opts;
  if (skipTestPaths && isLikelyTestOrCiMockPath(filePath)) {
    return [];
  }

  const findings = [];
  const isExample = isEnvExampleFile(filePath);

  for (const { name, regex } of SECRET_PATTERNS) {
    const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
    const re = new RegExp(regex.source, flags);
    const matches = content.matchAll(re);
    for (const m of matches) {
      const match = m[0];
      if (looksLikePlaceholder(match)) continue;

      if (name === "TOKEN_ENCRYPTION_KEY value") {
        const inner = m[1];
        if (!inner || looksLikePlaceholder(inner)) continue;
      }

      if (isExample && name === "Railway token (hardcoded)" && isRailwayTokenPlaceholder(match)) {
        continue;
      }

      if (name === "Postgres URL with password" && isPostgresUrlDocPlaceholder(match)) {
        continue;
      }

      const line = content.slice(0, m.index).split("\n").length;
      findings.push({
        name,
        match: match.length > 48 ? `${match.substring(0, 48)}...` : match,
        line,
      });
    }
  }

  return findings;
}
