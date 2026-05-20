// Resolve a module from the user's project root, NOT from the skill's own
// directory. The skill ships as pure markdown + scripts and intentionally
// does not vendor heavy native deps like sharp — users install them in
// their own project so binaries match their platform / Node version.
//
// We pin a synthetic anchor file under cwd so createRequire walks the
// caller's node_modules chain instead of the skill's.

import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const req = createRequire(resolve(process.cwd(), '_'))

export function resolveFromCwd(name) {
  return req.resolve(name)
}

export function requireFromCwd(name) {
  return req(name)
}
