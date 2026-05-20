# ts-best-practices-functional

> Refactor or write TypeScript using a functional doctrine.

A skill that bakes in factory functions over classes, `Result<T,E>` over exceptions, immutable state via spread/map/filter, and pure functions composed in pipelines.

## Install

```bash
npx skills add zrosenbauer/skills --skill ts-best-practices-functional
```

## What it does

- Converts class-based stateful types to factory functions with closure-encapsulated state
- Replaces thrown exceptions with `Result<T, E>` discriminated unions
- Removes mutation: arrays/objects are copied via spread/map/filter
- Splits pure business logic from side-effectful I/O (side effects live at the edges)
- Derives values from source state instead of storing duplicates

## Trigger phrases

- "make this functional"
- "remove the class"
- "use Result instead of throw"
- "stop mutating this"
- "refactor to factory function"
- "compose these as pure functions"
- "use immutable state"

## When NOT to use

- Class wraps a stateful external SDK (`PrismaClient`, `Octokit`, WebSocket) — keep it
- Framework requires a class (legacy React class components, custom Error subclasses)
- General TS hygiene → use `ts-best-practices` instead

## License

[MIT](./LICENSE) © Zac Rosenbauer
