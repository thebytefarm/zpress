/**
 * Node-only entry for `@zpress/ui`.
 *
 * `createRspressConfig` and `zpressPlugin` import filesystem APIs, `ts-morph`,
 * and other Node-only deps for build-time config assembly. They MUST NOT be
 * imported from any client-side code path.
 */

export { createRspressConfig } from './config.ts'
export { zpressPlugin } from './plugin.ts'

// Re-export the client-safe surface so Node consumers (the CLI) can import
// everything from one path if they want.
export * from './index.ts'
