import type { ZpressConfig } from '@zpress/config'
import { loadConfig } from '@zpress/config/loader'
import { afterAll, beforeAll, bench, describe } from 'vitest'

// Sync engine moved into @zpress/cli internals after the @zpress/core deletion.
// Benchmarks consume it via deep workspace-relative imports since the CLI
// only publishes the bin entry, not its lib surface. These imports work
// because vitest's TS loader resolves relative paths across the monorepo.
import { createPaths } from '../../../packages/cli/src/lib/paths.ts'
import { sync } from '../../../packages/cli/src/lib/sync/index.ts'
import type { GeneratedFixture } from '../helpers/fixtures.ts'
import { BENCH_OPTIONS, TIERS, generateFixture } from '../helpers/fixtures.ts'

interface PreparedFixture {
  readonly fixture: GeneratedFixture
  readonly config: ZpressConfig
  readonly paths: ReturnType<typeof createPaths>
}

const prepared = new Map<string, PreparedFixture>()

beforeAll(async () => {
  const results = await Promise.all(
    TIERS.map(async (tier) => {
      const fixture = generateFixture({ files: tier.files })
      const paths = createPaths(fixture.dir)
      const [error, config] = await loadConfig(paths.repoRoot)
      if (error || !config) {
        throw new Error(`Failed to load config for ${tier.name}: ${error}`)
      }
      return [tier.name, { fixture, config, paths }] as const
    })
  )
  results.map(([name, entry]) => prepared.set(name, entry))
})

afterAll(() => {
  prepared.forEach((p) => p.fixture.cleanup())
})

describe.each(TIERS)('sync() (code) — $name (~$files files)', (tier) => {
  bench(
    'sync',
    async () => {
      const p = prepared.get(tier.name)
      if (!p) {
        throw new Error(`Fixture not prepared for tier: ${tier.name}`)
      }
      await sync(p.config, { paths: p.paths, quiet: true })
    },
    BENCH_OPTIONS
  )
})
