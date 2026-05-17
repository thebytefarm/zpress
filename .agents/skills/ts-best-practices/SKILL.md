---
name: ts-best-practices
description: >-
  This skill should be used when the user wants to write, review, or refactor
  TypeScript code to follow industry best practices. Common triggers include
  "follow ts best practices", "review this typescript", "fix the typescript
  style", "make this idiomatic typescript", "apply typescript conventions",
  and "audit this ts file".
  Bakes in branded types, discriminated unions, ts-pattern for multi-branch
  logic, JSDoc on exports, kebab-case file naming, and *Params/*Options
  object-arg conventions. Skip when the user wants pure functional refactors
  (use ts-best-practices-functional) or is writing framework components
  (React/Vue/Svelte have different conventions).
# --- Claude Code extensions (ignored by other agents) ---
argument-hint: '[<file-or-dir>]'
user-invocable: true
model-invocable: true
---

# ts-best-practices

Write, review, and refactor TypeScript code to follow battle-tested conventions: object-arg parameters, JSDoc on exports, discriminated unions for variants, branded types for IDs, ts-pattern for multi-branch logic, and exports-first file structure.

## When to use

Verbatim trigger phrases:

- "follow ts best practices"
- "review this typescript"
- "fix the typescript style"
- "make this idiomatic typescript"
- "apply typescript conventions"
- "audit this ts file"

## When NOT to use

- User wants functional-style refactors → use `ts-best-practices-functional`
- User is writing framework components (React, Vue, Svelte) — different conventions apply
- User is working in plain JavaScript without TypeScript
- User is debugging a runtime error (best-practices is a code-shape concern, not a debug tool)

## Core conventions

### Naming

| Element          | Convention                                  | Example                                     |
| ---------------- | ------------------------------------------- | ------------------------------------------- |
| Files            | `kebab-case.ts`                             | `user-service.ts`, `auth-types.ts`          |
| Variables        | `camelCase`                                 | `userId`, `isAuthenticated`                 |
| Functions        | `camelCase` (verbs)                         | `createUser`, `parseHeaders`                |
| Types/interfaces | `PascalCase`                                | `User`, `CreateUserParams`                  |
| Constants        | `SCREAMING_SNAKE_CASE`                      | `MAX_RETRIES = 3`                           |
| Const objects    | `SCREAMING_SNAKE_CASE` keys with `as const` | `GITHUB_EVENTS = { PUSH: 'push' } as const` |

Object properties: prefer **nested** when properties form a logical group; flat for standalone values.

<good>
interface Connection {
  clerk: { orgId: string; userId: string }
  github: { installationId: number; repoId: number }
}
</good>

<bad>
interface Connection {
  clerkOrgId: string
  clerkUserId: string
  githubInstallationId: number
  githubRepoId: number
}
</bad>

### File structure

Top-to-bottom order in every `.ts` file:

1. Imports (grouped: node built-ins, external, internal `@pkg/*`, relative — blank line between groups)
2. Types (interfaces, type aliases)
3. Constants
4. Exported functions (the public API — first, so readers see it without scrolling)
5. Private functions (`function` declarations are hoisted, so position doesn't matter)

No banner comments (`// === HELPERS ===`). The structure speaks for itself.

### Function parameters

Use an object parameter when a function has **2+ related parameters**. Define an interface with `Params` / `Options` / `Args` suffix, destructure in the signature.

<good>
interface CreateUserParams {
  name: string
  email: string
  roleId: string
}

export function createUser({ name, email, roleId }: CreateUserParams): User {
// ...
}
</good>

<bad>
export function createUser(name: string, email: string, roleId: string): User {
  // easy to swap email and name at the call site
}
</bad>

| Suffix     | Use case                         |
| ---------- | -------------------------------- |
| `*Params`  | Required input parameters        |
| `*Options` | Optional configuration           |
| `*Args`    | Function arguments (less common) |

### JSDoc

Every exported function needs JSDoc with `@param`, `@returns`, and `@example` (when useful). Document the _why_, not the _what_. Skip only in test files.

````ts
/**
 * Parses raw webhook headers into a typed structure.
 *
 * @param params - The raw headers and provider identifier
 * @returns Parsed webhook headers or a parse error
 *
 * @example
 * ```ts
 * const result = parseWebhookHeaders({ headers, provider: 'github' })
 * ```
 */
export function parseWebhookHeaders(params: ParseHeadersParams) {
  // ...
}
````

Private (non-exported) functions get JSDoc too, with `@private`:

```ts
/**
 * Extracts the display name from a user record.
 *
 * @private
 */
function getDisplayName(user: User): string {
  return user.displayName ?? user.email
}
```

### Types

**Discriminated unions** for variants:

```ts
type AuthStrategy =
  | { strategy: 'connection'; connectionId: string }
  | { strategy: 'integration'; integrationId: string }
  | { strategy: 'user'; userId: string; token: string }
```

**Branded types** for IDs (prevents accidentally swapping `userId` and `orgId`):

```ts
type Brand<T, B> = T & { __brand: B }
type UserId = Brand<string, 'UserId'>
type OrgId = Brand<string, 'OrgId'>

function userId(id: string): UserId {
  return id as UserId
}
```

**`as const`** for literal types:

```ts
const STATUSES = ['pending', 'active', 'completed'] as const
type Status = (typeof STATUSES)[number] // "pending" | "active" | "completed"
```

**`type-fest`** for utility types not in stdlib: `SetRequired`, `SetOptional`, `PartialDeep`, `ReadonlyDeep`, `Except`, `Simplify`.

**Never** use `any` — use `unknown` and narrow with type guards.

### Conditionals

| Scenario             | Use                                       | Why                           |
| -------------------- | ----------------------------------------- | ----------------------------- |
| Early return / guard | `if`                                      | Cleaner guard clauses         |
| Simple A or B        | Single inline ternary or a tiny `if/else` | Lightweight, no library churn |
| 3+ branches          | `ts-pattern`'s `match()`                  | Exhaustive, readable          |
| Discriminated unions | `ts-pattern` with `.exhaustive()`         | Compile-time safety           |

<good>
import { match } from 'ts-pattern'

const message = match(status)
.with('pending', () => 'Waiting...')
.with('success', () => 'Done!')
.with('error', () => 'Failed')
.exhaustive() // compile error if a case is missing
</good>

<bad>
// nested ternary — banned by linter
const message = status === 'pending' ? 'Waiting' : status === 'success' ? 'Done' : 'Failed'
</bad>

<bad>
// switch without exhaustiveness check
switch (status) {
  case 'pending': return 'Waiting'
  case 'success': return 'Done'
  // missing 'error' — no compile warning
}
</bad>

### Anti-patterns

| Avoid                                        | Use instead                        |
| -------------------------------------------- | ---------------------------------- |
| `any`                                        | `unknown` + narrow with type guard |
| Ternaries (esp. nested)                      | `call()` for A/B, `match()` for 3+ |
| `switch` statements                          | `match().with(...).exhaustive()`   |
| Banner comments (`// === HELPERS ===`)       | Let file structure speak           |
| Arrow functions for private helpers          | `function` declarations (hoisted)  |
| Type assertion (`as Foo`) without validation | Type guard or schema parse         |
| Concatenated property names (`clerkOrgId`)   | Nested objects (`clerk.orgId`)     |
| 5+ positional params                         | Refactor to a `*Params` object     |

## Examples

<example>
<input>"add a function to fetch a user with optional caching"</input>
<output>

````ts
import type { User } from './types'

interface FetchUserParams {
  userId: UserId
}

interface FetchUserOptions {
  cache?: boolean
  includeDeleted?: boolean
}

/**
 * Fetches a user by ID, optionally with caching.
 *
 * @param params - Required: the user ID to fetch
 * @param options - Optional: cache + soft-delete flags
 * @returns The user record, or null if not found
 *
 * @example
 * ```ts
 * const user = await fetchUser({ userId }, { cache: true })
 * ```
 */
export async function fetchUser(
  { userId }: FetchUserParams,
  options?: FetchUserOptions
): Promise<User | null> {
  if (options?.cache) {
    const cached = await readCache(userId)
    if (cached) return cached
  }

  return loadUser(userId, options?.includeDeleted ?? false)
}

/**
 * @private
 */
function readCache(userId: UserId): Promise<User | null> {
  // ...
}
````

The agent applied: `*Params` + `*Options` split, branded `UserId`, JSDoc with `@example`, exports-first ordering, no banner comments, early-return-style cache check, private helper at the bottom.

</output>
</example>

<example>
<input>"refactor this nested if/else handling deployment status"</input>
<output>

Before:

```ts
function renderStatus(deployment: Deployment) {
  if (deployment.status === 'building') {
    return 'Building...'
  } else if (deployment.status === 'ready') {
    if (deployment.error) {
      return `Failed: ${deployment.error}`
    } else {
      return `Ready at ${deployment.url}`
    }
  } else {
    return 'Unknown'
  }
}
```

After:

```ts
import { match, P } from 'ts-pattern'

function renderStatus(deployment: Deployment): string {
  return match(deployment)
    .with({ status: 'building' }, () => 'Building...')
    .with({ status: 'ready', error: P.nullish }, (d) => `Ready at ${d.url}`)
    .with({ status: 'ready' }, (d) => `Failed: ${d.error}`)
    .exhaustive()
}
```

Compile-time exhaustiveness, type-narrowed callbacks, no nested ifs.

</output>
</example>

## Rationalization table

Captured from RED-baseline transcripts where agents without this skill skipped rules under pressure. Future agents: recognize your own pattern before reaching for the excuse.

| Skipped rule                                        | Verbatim excuse                                                                                    | Why it's wrong                                                                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use `*Params` object for ≥2-arg functions           | "im in a meeting in 5 min, just inline the strings — I'll refactor later"                          | "Later" never comes. Positional args swap silently at the call site (email vs name vs roleId), and the cost of the interface is one block of text that pays for itself the first time the signature changes. |
| JSDoc on every exported function                    | "the change is tiny so I skipped JSDoc — the function name is self-documenting"                    | Names describe _what_, not _why_. The next reader (or model) loses the intent — and exports are the API surface, so docs there are highest-leverage. Add the JSDoc before merging, not after.                |
| Branded types for IDs (`UserId`, `OrgId`)           | "they're both strings basically, branded types feel over-engineered for a fetch"                   | "Basically" is the rationalization. Real bugs from swapping `userId` and `orgId` ship to prod regularly; the type is one line and free at runtime.                                                           |
| `ts-pattern` `match().exhaustive()` for ≥3 branches | "the existing `if/else` works, ts-pattern is overkill — my reviewer is gonna complain about churn" | The reviewer complains when a new variant is added and the `else` branch silently swallows it in prod. `.exhaustive()` is a compile-time tripwire — not a refactor for refactor's sake.                      |
| Never use `any`                                     | "this is internal/utility code, `any` is fine — `unknown` is more typing for the same thing"       | `any` opts out of the type checker; `unknown` opts in and forces a guard. They're not the same thing. Internal code outlives the "internal" framing.                                                         |

## References

- [type-fest](https://github.com/sindresorhus/type-fest) — utility types library
- [ts-pattern](https://github.com/gvergnaud/ts-pattern) — exhaustive matching
- [TypeScript handbook utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
