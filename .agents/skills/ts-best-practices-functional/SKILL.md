---
name: ts-best-practices-functional
description: >-
  This skill should be used when the user wants to refactor TypeScript code
  to functional patterns or write new code following functional doctrine.
  Common triggers include "make this functional", "remove the class", "use
  Result instead of throw", "stop mutating this", and "refactor to factory
  function". Bakes in factory functions over classes, Result<T,E> over
  exceptions, immutable state via spread/map/filter, and pure functions
  composed in pipelines. Skip when the user wants general TS hygiene (use
  ts-best-practices), the class wraps a stateful SDK (PrismaClient, Octokit,
  WebSocket), or a framework requires a class.
# --- Claude Code extensions (ignored by other agents) ---
argument-hint: '[<file-or-dir>]'
user-invocable: true
model-invocable: true
---

# ts-best-practices-functional

Refactor or author TypeScript using a functional doctrine: **factories** over classes, **Result<T,E>** over exceptions, **immutable state** via spread/map/filter, and **pure functions** composed in pipelines.

## When to use

Verbatim trigger phrases:

- "make this functional"
- "remove the class"
- "use Result instead of throw"
- "stop mutating this"
- "refactor to factory function"
- "compose these as pure functions"
- "use immutable state"

## When NOT to use

- The class wraps a stateful external SDK (`PrismaClient`, `Octokit`, WebSocket connections) — keep it
- Framework requires a class (legacy React class components, custom Error subclasses)
- User wants general TS hygiene → use `ts-best-practices`
- Working in plain JS without TypeScript

## Core principles

| Prefer               | Over        | Why                                  |
| -------------------- | ----------- | ------------------------------------ |
| Data transformations | Mutations   | Predictable, easier to reason about  |
| Functions            | Methods     | No `this` binding issues             |
| Composition          | Inheritance | Mix behaviors without coupling       |
| Explicit             | Implicit    | State passed in, not hidden          |
| Factories            | Classes     | Closure-encapsulated state, no `new` |

## Patterns

### Factories over classes

Use a factory function returning an interface to encapsulate state. Closures make the state truly private; no `this` to bind.

<good>
interface Counter {
  increment: () => number
  decrement: () => number
  getValue: () => number
}

function createCounter(initial: number = 0): Counter {
let value = initial
return {
increment: () => ++value,
decrement: () => --value,
getValue: () => value,
}
}

const counter = createCounter(10)
counter.increment() // 11
</good>

<bad>
class Counter {
  count = 0
  increment() { this.count++ }
}

const c = new Counter()
const fn = c.increment
fn() // TypeError — `this` is lost!
</bad>

#### Factory advantages

- No `this` confusion
- No `new` keyword
- Easy to test (just call the function)
- Can return different implementations based on env/config
- Private state via closure (truly inaccessible from outside)

```ts
// Factory returning different implementations
function createLogger(env: 'dev' | 'prod') {
  if (env === 'dev') {
    return { log: (msg: string) => console.log(`[DEV] ${msg}`) }
  }
  return { log: (msg: string) => sendToLogService(msg) }
}
```

### Immutability by default

Never mutate arrays or objects passed in. Return new state.

<good>
function addItem(items: Item[], newItem: Item): Item[] {
  return [...items, newItem]
}

function updateItem(items: Item[], id: string, updates: Partial<Item>): Item[] {
return items.map((item) =>
item.id === id ? { ...item, ...updates } : item
)
}

function removeItem(items: Item[], id: string): Item[] {
return items.filter((item) => item.id !== id)
}
</good>

<bad>
const items: Item[] = []

function addItem(item: Item) {
items.push(item) // mutates outer state!
}

function updateItem(id: string, updates: Partial<Item>) {
const item = items.find((i) => i.id === id)
Object.assign(item, updates) // mutates the item!
}
</bad>

Use `readonly` modifiers and `as const` to enforce at the type level:

```ts
function processItems(items: readonly Item[]): readonly Item[] {
  return items.filter((item) => item.active)
}

const STATUSES = ['pending', 'active', 'done'] as const
type Status = (typeof STATUSES)[number]
```

### Result<T,E> over exceptions

For expected failure modes (parsing, validation, network, I/O), return a `Result<T, E>` instead of throwing. Errors become part of the type signature.

```ts
interface Ok<T> {
  readonly ok: true
  readonly value: T
}
interface Err<E> {
  readonly ok: false
  readonly error: E
}
type Result<T, E = Error> = Ok<T> | Err<E>

const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
const err = <E>(error: E): Err<E> => ({ ok: false, error })
```

<good>
interface ParseError {
  type: 'invalid_json' | 'schema_mismatch'
  message: string
}

function parseConfig(json: string): Result<Config, ParseError> {
try {
return ok(JSON.parse(json))
} catch {
return err({ type: 'invalid_json', message: 'Invalid JSON' })
}
}

const result = parseConfig(input)
if (!result.ok) {
logger.warn({ error: result.error }, 'parse failed')
return
}
processConfig(result.value) // typed as Config
</good>

<bad>
function parseConfig(json: string): Config {
  return JSON.parse(json)  // throws on bad input — caller doesn't know
}

// caller forgets to try/catch
const config = parseConfig(input) // crashes the request
</bad>

#### When Result is and isn't appropriate

| Use Result                              | Don't use Result                           |
| --------------------------------------- | ------------------------------------------ |
| JSON parsing, validation                | Truly exceptional errors (out-of-memory)   |
| External API calls                      | Programming bugs (assertion failures)      |
| File I/O, network                       | Internal invariants that should never fail |
| Business logic with known failure modes | Operations with no realistic failure       |

#### Async pattern

```ts
async function attemptAsync<T, E = unknown>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    return ok(await fn())
  } catch (error) {
    return err(error as E)
  }
}

const result = await attemptAsync(() => fetch('/api/users'))
if (!result.ok) return logger.error('fetch failed')
const response = result.value
```

#### Domain-specific error types

Define error types per domain — generic `Error` loses information.

```ts
interface ApiError {
  type: 'network' | 'timeout' | 'unauthorized' | 'not_found' | 'server_error'
  message: string
  statusCode?: number
}

async function fetchUser(id: UserId): Promise<Result<User, ApiError>> {
  // ...
}
```

### Pure functions + composition

Pure functions: same inputs → same outputs, no side effects (no I/O, no global state changes, no mutation of arguments).

```ts
// pure
function calculateTotal(items: readonly Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// impure — side effects
function calculateTotal(items: Item[]): number {
  console.log('Calculating...') // side effect: I/O
  analytics.track('total_calculated') // side effect: external state
  return items.reduce((s, i) => s + i.price, 0)
}
```

Isolate side effects at the **edges** of the application:

```ts
// pure business logic
function validateUser(user: User): Result<User, ValidationError> {
  // ...
}

// side effects at the edge
async function handleUserCreate(user: User) {
  const validation = validateUser(user) // pure
  if (!validation.ok) {
    logger.warn({ validation }, 'invalid user') // I/O at edge
    return
  }
  await db.user.create(validation.value) // I/O at edge
}
```

Compose small pure functions:

```ts
const normalize = (s: string) => s.trim().toLowerCase()
const validate = (s: string) => s.length > 0
const format = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function processName(input: string): string | null {
  const normalized = normalize(input)
  if (!validate(normalized)) return null
  return format(normalized)
}
```

### Derived state, not duplicated

Compute derived values from source state. Don't store them.

<good>
interface CartState {
  items: readonly CartItem[]
}

function getTotal(state: CartState): number {
return state.items.reduce((sum, item) => sum + item.price, 0)
}

function getItemCount(state: CartState): number {
return state.items.length
}
</good>

<bad>
interface CartState {
  items: CartItem[]
  total: number       // gets out of sync with items
  itemCount: number   // gets out of sync with items
}
</bad>

## When classes ARE OK

| Acceptable                                                      | Reason                               |
| --------------------------------------------------------------- | ------------------------------------ |
| Wrapping external SDK (`PrismaClient`, `Octokit`)               | Existing API uses class form         |
| Long-lived stateful resources (WebSocket handlers)              | Lifecycle naturally maps to instance |
| Framework requirements (React class components, custom `Error`) | No alternative                       |
| Single instance whose constructor does meaningful setup         | The class form is genuinely clearer  |

For everything else (utility classes, static method collections, data containers, singletons): use a module of functions or a factory.

## Examples

<example>
<input>"refactor this Counter class to a factory"</input>
<output>

Before:

```ts
class Counter {
  count = 0
  increment() {
    this.count++
  }
  decrement() {
    this.count--
  }
  getValue() {
    return this.count
  }
}
```

After:

```ts
interface Counter {
  increment: () => number
  decrement: () => number
  getValue: () => number
}

export function createCounter(initial: number = 0): Counter {
  let value = initial
  return {
    increment: () => ++value,
    decrement: () => --value,
    getValue: () => value,
  }
}
```

State is now closure-private. Callers don't deal with `this`. Multiple counters are independent without `new`.

</output>
</example>

<example>
<input>"this parseConfig throws — convert to Result"</input>
<output>

Before:

```ts
function parseConfig(json: string): Config {
  if (!json) throw new Error('Empty input')
  return JSON.parse(json) // can also throw SyntaxError
}
```

After:

```ts
interface ConfigError {
  type: 'empty_input' | 'invalid_json'
  message: string
}

function parseConfig(json: string): Result<Config, ConfigError> {
  if (!json) return err({ type: 'empty_input', message: 'Empty input' })
  try {
    return ok(JSON.parse(json))
  } catch (e) {
    return err({ type: 'invalid_json', message: (e as Error).message })
  }
}

// caller now must handle both branches at compile time
const result = parseConfig(input)
if (!result.ok) {
  return match(result.error)
    .with({ type: 'empty_input' }, () => respondWithError(400, 'Empty body'))
    .with({ type: 'invalid_json' }, () => respondWithError(400, 'Bad JSON'))
    .exhaustive()
}
processConfig(result.value)
```

Errors are part of the type signature now — callers can't accidentally ignore them.

</output>
</example>

## Rationalization table

Captured from RED-baseline transcripts where agents without this skill skipped functional doctrine under pressure. Recognize your own pattern before reaching for the excuse.

| Skipped rule                                 | Verbatim excuse                                                                                  | Why it's wrong                                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Replace the class with a factory             | "the class works fine and refactoring feels risky — I'll just touch it as little as possible"    | The "small change" is exactly when discipline pays off; risk compounds across the next ten changes. The factory is mechanically safe (interface + closure + return), and `this`-binding bugs are a real prod cost the class invites. |
| Convert `throw new Error` to `Result<T,E>`   | "Result is ceremony for a 2-line function — try/catch at the caller is fine"                     | Caller "fine" decays the moment one caller forgets the try/catch. Result puts failure modes into the type signature so the compiler enforces handling. The ceremony is one wrapper.                                                  |
| Stop mutating `items.push` / `Object.assign` | "we own this array, no one else holds a reference — mutation is faster"                          | Mutations leak through closures, async boundaries, and React renders. "We own it" is true today and false next refactor. Spread/map/filter are O(n) — the same as the loop you just wrote.                                           |
| Use `Result` for parse / validate / I/O      | "we've always thrown, the codebase is consistent — switching one function makes it inconsistent" | The codebase is consistently buggy — that is what the rule fixes. Pick a boundary (this module, this PR), apply it consistently inside that boundary, and migrate outward.                                                           |
| Pure functions + side effects at the edge    | "logging inside the calc is convenient and only one line — pulling it out adds plumbing"         | "One line" of side effect makes the function untestable without mocks and unreusable in a different runtime (worker, batch job). Lift the log to the caller; the function stays pure.                                                |

## References

- [ts-pattern](https://github.com/gvergnaud/ts-pattern) — exhaustive matching for `Result` handling
- [type-fest](https://github.com/sindresorhus/type-fest) — `ReadonlyDeep` and other immutability utilities
- Rust's [Result type](https://doc.rust-lang.org/std/result/) — original inspiration for the pattern
