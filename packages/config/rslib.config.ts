import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      bundle: true,
      syntax: 'esnext',
      autoExtension: false,
      autoExternal: true,
      dts: { bundle: true },
      source: {
        entry: {
          index: './src/index.ts',
          loader: './src/loader.ts',
        },
      },
      output: {
        filename: {
          js: '[name].mjs',
        },
      },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: true,
  },
})
