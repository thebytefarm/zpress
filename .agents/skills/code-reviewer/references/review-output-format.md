# Review output format

How to format the review. Universal across all four personas. Matches the three-tier severity from `skill-tools` lint so consumers can read both.

## Severity tiers

| Tier    | Meaning                                                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------- |
| `error` | Concrete failure / vulnerability / regression in production-likely code paths. Fix before shipping.      |
| `warn`  | Likely problem; specific conditions or future scale required to hit it. Fix unless explicitly justified. |
| `info`  | Recommendation, defense-in-depth, opportunistic improvement. Apply if cheap.                             |

The persona refines what each tier means in its category — see each persona doc.

## Output structure

```
# Code review

SUMMARY: {N} findings ({E} error / {W} warn / {I} info)
{one-line gist of the worst category}

## ERRORS

✗ {file}:{line}  {finding-code or category}  {one-line summary}
  {1–3 lines of detail: scenario, impact, sometimes a fix suggestion}

✗ {file}:{line}  ...

## WARNS

⚠ {file}:{line}  {finding-code or category}  {one-line summary}
  {detail}

## INFOS

ℹ {file}:{line}  {finding-code or category}  {one-line summary}
  {detail}

## Clean

The following sections passed without findings. Listed explicitly so silence reads as intent, not omission:
- {file or area}
- {file or area}
```

## Ordering

- Within a tier, sort by file path then by line number
- Tier order is always `ERRORS → WARNS → INFOS → Clean` — readers scan top-down
- If a finding spans multiple files, pick the most-impactful location for the anchor and reference the others in the body

## File:line anchors

Use **path:line** in code-fence-friendly form so editors auto-link:

```
✗ src/auth/session.ts:47  CWE-89  raw SQL concat
```

Not:

```
✗ in src/auth/session.ts around line 47, there is a problem with...
```

## Detail line conventions

Each finding's body should answer in 1–3 lines:

1. **What** — name the offending pattern in plain language; one-line. Reference by `file:line`. Do not reproduce code or diff content.
2. **Why it fails** — the failure mode in concrete terms
3. **Fix** — the obvious mitigation, single-line; skip if the fix is the inverse of (2)

If you find yourself writing a paragraph, the finding is too big — split it.

## What the summary line says

The summary at the top is one line, and it's about the worst category:

| If errors > 0 | "Critical: {worst error one-liner}" |
| If only warns | "No errors. {N} warns, mostly {dominant category}" |
| If only infos | "Clean. {N} info-level recommendations only." |
| If everything passed | "Clean across all {N} files reviewed." |

## Don't

- Don't write a "review report" with 5 paragraphs of intro / context / conclusion — the format above IS the report
- Don't congratulate the author. The clean section is the praise mechanism.
- Don't redo what a linter would catch (`oxlint`, `eslint`, `prettier`). Code reviews catch what linters can't.
- Don't paraphrase the failure mode — name the specific bug in concrete terms. The user already has the file open at the referenced `file:line`; reproducing source content adds no signal and risks leaking secrets that happen to live near the issue.

## Example

```
# Code review

SUMMARY: 6 findings (2 error / 3 warn / 1 info)
Critical: src/auth/session.ts:47 — unsigned cookie used as identity check (session fixation)

## ERRORS

✗ src/auth/session.ts:47  CWE-384  unsigned cookie used as identity check
  Cookie value is read from the request and used as auth identity directly.
  Attacker can set their own cookie to any user's id.
  Fix: sign the cookie or replace with a server-issued opaque session token.

✗ src/api/users.ts:118  CWE-89  raw SQL string concatenation with request input
  Query is built by interpolating `req.query.id` into the SQL — bypassable with classic boolean injection.
  Fix: use the ORM's parameterized form (`findUnique({ where: { id } })`).

## WARNS

⚠ src/auth/login.ts:122  non-constant-time password comparison
  Equality operator used; timing differences leak prefix length.
  Fix: use a constant-time comparison primitive (`crypto.timingSafeEqual`).

⚠ src/api/leaderboard.ts:54  O(n²) on scores.length
  Nested filter+map pattern. ~80ms at n=2000 on M1; visible at 5k entries.
  Fix: bucket scores into a `Map<userId, score>` first, then map once.

⚠ src/utils/cache.ts:8  module-scoped cache without eviction
  Map allocated at module scope, never cleared. Memory grows unbounded.
  Fix: lru-cache or explicit ttl.

## INFOS

ℹ src/auth/oauth.ts:66  state parameter not validated against session
  CSRF on the OAuth callback is theoretical here (state IS set), but the callback
  doesn't compare it. Defense-in-depth.

## Clean

- src/utils/clamp.ts — pure, all edges handled (NaN, Infinity, swapped min/max)
- src/types/result.ts — straightforward discriminated union
- src/api/health.ts — trivial endpoint, nothing to flag
```
