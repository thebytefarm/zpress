# ts-best-practices

> Write, review, and refactor TypeScript code with industry-tested conventions.

A skill that bakes in object-arg parameters (`*Params` / `*Options`), JSDoc on exports, discriminated unions, branded types, ts-pattern for multi-branch logic, and exports-first file structure.

## Install

```bash
npx skills add zrosenbauer/skills --skill ts-best-practices
```

## What it does

Applies a consolidated TypeScript style across files when invoked:

- File names in `kebab-case`, variables in `camelCase`, types in `PascalCase`
- Functions with 2+ params take a `*Params` object, destructured in the signature
- All exports get JSDoc with `@param` / `@returns` / `@example`
- Discriminated unions for variants, branded types for IDs, `as const` for literals
- `ts-pattern`'s `match().exhaustive()` for 3+ conditional branches
- Exports first, private helpers at the bottom (no banner comments)

## Trigger phrases

- "follow ts best practices"
- "review this typescript"
- "fix the typescript style"
- "make this idiomatic typescript"
- "apply typescript conventions"
- "audit this ts file"

## When NOT to use

- Functional-style refactors → `ts-best-practices-functional`
- Framework components (React, Vue) — different conventions apply
- Plain JavaScript without TypeScript

## License

[MIT](./LICENSE) © Zac Rosenbauer
