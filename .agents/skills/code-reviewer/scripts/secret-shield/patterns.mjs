/**
 * secret-shield/patterns — registry of known secret formats, scoped to
 * patterns with high signal and low false-positive rates.
 *
 * Each entry:
 *   - id: stable kebab-case identifier (used in redaction placeholders)
 *   - name: human-readable
 *   - pattern: RegExp source string (kept for diagnostics / tests)
 *   - regex: pre-compiled global RegExp — built once at module load so the
 *     scan hot loop can reuse it (reset lastIndex per scan)
 *   - severity: "high" | "medium"
 *
 * Add new patterns here. Don't add generic "long entropy string" rules —
 * those produce too many false positives in code review.
 *
 * Patterns anchor on identifier-boundary lookarounds (`(?<![A-Za-z0-9_])`
 * before the prefix, `(?![A-Za-z0-9_])` after the variable tail) so that
 * (a) secrets embedded inside a longer alphanumeric blob don't match and
 * (b) real-world keys longer than the documented length aren't truncated
 *     (which would leave the suffix unredacted in the surrounding text).
 *
 * Sources:
 *   - GitHub token formats: https://github.blog/changelog/2021-03-31-authentication-token-format-updates/
 *   - AWS access key prefix: https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html
 *   - OpenAI key formats: https://platform.openai.com/docs/api-reference/authentication
 *   - Anthropic key format: https://docs.claude.com/en/api/authentication
 *
 * @typedef {object} SecretPattern
 * @property {string} id
 * @property {string} name
 * @property {string} pattern
 * @property {RegExp} regex
 * @property {"high"|"medium"} severity
 */

/** @type {Array<Omit<SecretPattern, 'regex'> & { flags?: string }>} */
const RAW_PATTERNS = [
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    pattern: '(?<![A-Za-z0-9_])AKIA[0-9A-Z]{16,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'github-pat-classic',
    name: 'GitHub Personal Access Token (classic)',
    pattern: '(?<![A-Za-z0-9_])ghp_[A-Za-z0-9]{36,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'github-pat-fine-grained',
    name: 'GitHub Fine-grained Personal Access Token',
    pattern: '(?<![A-Za-z0-9_])github_pat_[A-Za-z0-9_]{82,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'github-oauth',
    name: 'GitHub OAuth Token',
    pattern: '(?<![A-Za-z0-9_])gho_[A-Za-z0-9]{36,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'github-app-server',
    name: 'GitHub App Server-to-Server Token',
    pattern: '(?<![A-Za-z0-9_])ghs_[A-Za-z0-9]{36,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'github-app-user',
    name: 'GitHub App User-to-Server Token',
    pattern: '(?<![A-Za-z0-9_])ghu_[A-Za-z0-9]{36,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'github-refresh',
    name: 'GitHub Refresh Token',
    pattern: '(?<![A-Za-z0-9_])ghr_[A-Za-z0-9]{36,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'openai-legacy',
    name: 'OpenAI API Key (legacy)',
    pattern: '(?<![A-Za-z0-9_])sk-[A-Za-z0-9]{48,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'openai-project',
    name: 'OpenAI API Key (project-scoped)',
    pattern: '(?<![A-Za-z0-9_])sk-proj-[A-Za-z0-9_-]{40,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'anthropic-api',
    name: 'Anthropic API Key',
    pattern: '(?<![A-Za-z0-9_])sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{40,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: '(?<![A-Za-z0-9_])xox[abprs]-[0-9]+-[0-9]+(?:-[0-9]+)?-[A-Za-z0-9]+(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'stripe-secret',
    name: 'Stripe Secret Key',
    pattern: '(?<![A-Za-z0-9_])(?:sk|rk)_live_[A-Za-z0-9]{24,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'google-api-key',
    name: 'Google API Key',
    pattern: '(?<![A-Za-z0-9_])AIza[A-Za-z0-9_-]{35,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'azure-storage-key',
    name: 'Azure Storage Account Key',
    pattern: 'AccountKey=[A-Za-z0-9+/]{86}==',
    severity: 'high',
  },
  {
    id: 'gcp-service-account-private-key',
    name: 'GCP Service Account Private Key (JSON)',
    pattern: '"private_key"\\s*:\\s*"-----BEGIN (?:RSA )?PRIVATE KEY-----',
    severity: 'high',
  },
  {
    id: 'npm-token',
    name: 'npm Access Token',
    pattern: '(?<![A-Za-z0-9_])npm_[A-Za-z0-9]{36,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'twilio-account-sid',
    name: 'Twilio Account SID',
    pattern: '(?<![A-Za-z0-9_])AC[a-f0-9]{32}(?![A-Za-z0-9_])',
    severity: 'medium',
  },
  {
    id: 'twilio-api-key',
    name: 'Twilio API Key',
    pattern: '(?<![A-Za-z0-9_])SK[a-f0-9]{32}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'sendgrid-api-key',
    name: 'SendGrid API Key',
    pattern: '(?<![A-Za-z0-9_])SG\\.[A-Za-z0-9_-]{22}\\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'digitalocean-pat',
    name: 'DigitalOcean Personal Access Token',
    pattern: '(?<![A-Za-z0-9_])dop_v1_[a-f0-9]{64}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'huggingface-token',
    name: 'Hugging Face Access Token',
    pattern: '(?<![A-Za-z0-9_])hf_[A-Za-z0-9]{34,}(?![A-Za-z0-9_])',
    severity: 'high',
  },
  {
    id: 'jwt',
    name: 'JSON Web Token',
    pattern:
      '(?<![A-Za-z0-9_])eyJ[A-Za-z0-9_-]{8,}\\.eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{5,}(?![A-Za-z0-9_])',
    severity: 'medium',
  },
  {
    id: 'private-key-block',
    name: 'PEM Private Key',
    pattern: '-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----',
    severity: 'high',
  },
  {
    id: 'generic-env-style',
    name: 'Generic env-style secret assignment',
    pattern:
      '(?:API_KEY|SECRET|TOKEN|PASSWORD|PASSWD)\\s*[:=]\\s*["\']?[A-Za-z0-9_+/=-]{16,}["\']?',
    severity: 'medium',
    flags: 'gi',
  },
]

/** @type {SecretPattern[]} */
export const PATTERNS = RAW_PATTERNS.map((p) => ({
  id: p.id,
  name: p.name,
  pattern: p.pattern,
  severity: p.severity,
  regex: new RegExp(p.pattern, p.flags ?? 'g'),
}))
