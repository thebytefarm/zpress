import { defineConfig } from '@rslib/core'

const SHARED = {
  format: 'esm' as const,
  bundle: true,
  syntax: 'esnext' as const,
  autoExtension: false,
  autoExternal: true,
  dts: { bundle: true },
  output: {
    filename: {
      js: '[name].mjs',
    },
  },
}

export default defineConfig({
  lib: [
    // Client-safe entry — no Node shims so the bundle stays browser-clean.
    // The Rspress client bundle reaches this entry via `@zpress/kit`, so it
    // MUST NOT contain any `node:*` imports or CJS-shim side effects.
    {
      ...SHARED,
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
    },
    // Node-only entry — shims enabled because Node helpers (`createRequire`,
    // `__dirname`, `__filename`) are needed inside `createRspressConfig` /
    // `zpressPlugin`.
    {
      ...SHARED,
      shims: { esm: { __dirname: true, __filename: true, require: true } },
      source: {
        entry: {
          node: './src/node.ts',
        },
      },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: true,
    externals: [/ts-morph/],
    copy: [
      { from: './src/theme', to: 'theme' },
      {
        from: './src/plugins/mermaid/MermaidRenderer.tsx',
        to: 'plugins/mermaid/MermaidRenderer.tsx',
      },
      { from: './src/plugins/mermaid/mermaid.css', to: 'plugins/mermaid/mermaid.css' },
      {
        from: './node_modules/rspress-plugin-file-tree/dist/components',
        to: 'components',
      },
      {
        from: './node_modules/rspress-plugin-file-tree/dist',
        to: '',
        globOptions: {
          ignore: ['**/components/**', '**/index.*'],
        },
      },
    ],
  },
})
