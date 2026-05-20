import { resolve } from 'node:path'

import { dev } from '@rspress/core'
import { loadConfig } from '@zpress/config/loader'
import { createRspressConfig } from '@zpress/ui/node'

const cwd = resolve(import.meta.dirname, '..', '..')
const [configErr, config] = await loadConfig(cwd)
if (configErr) {
  console.error('config error:', configErr.message)
  process.exit(1)
}
const paths = {
  repoRoot: cwd,
  outputRoot: resolve(cwd, '.zpress'),
  contentDir: resolve(cwd, '.zpress/content'),
  publicDir: resolve(cwd, '.zpress/public'),
  distDir: resolve(cwd, '.zpress/dist'),
  cacheDir: resolve(cwd, '.zpress/cache'),
}
await dev({
  appDirectory: paths.repoRoot,
  docDirectory: paths.contentDir,
  config: createRspressConfig({ config, paths, logLevel: 'info' }),
  configFilePath: '',
  extraBuilderConfig: { server: { port: 6176, strictPort: false }, dev: { progressBar: false } },
})
console.log('[ready] http://localhost:6176')
await new Promise(() => {})
