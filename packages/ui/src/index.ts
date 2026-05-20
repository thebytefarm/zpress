/**
 * Client-safe entry for `@zpress/ui`.
 *
 * Only React components and pure helpers live here. Anything that touches
 * the filesystem, `node:*` modules, `ts-morph`, or any other Node-only dep
 * lives in `./node.ts` and is published under the `@zpress/ui/node` subpath.
 *
 * This split exists so the Rspress client bundle (which reaches into
 * `@zpress/kit` → `@zpress/ui`) cannot pull Node-only build tooling into
 * the browser graph.
 */

export { ZpressLogo } from './theme/components/shared/zpress-logo.tsx'
export type { ZpressLogoProps } from './theme/components/shared/zpress-logo.tsx'
