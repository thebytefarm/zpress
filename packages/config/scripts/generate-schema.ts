/**
 * Generate JSON Schema from Zod schemas for IDE autocomplete and validation.
 *
 * Uses Zod v4's native `z.toJSONSchema()` because `zpressConfigSchema` is now a
 * Zod v4 schema (it composes `themeConfigSchema` re-exported from `@zpress/theme`,
 * which is v4). The legacy `zod-to-json-schema` package only handles v3 schemas
 * via the `zod/v3` import alias.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { z } from 'zod'

import { zpressConfigSchema } from '../src/schema.ts'

const packageJsonPath = resolve(import.meta.dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string }
const currentVersion = packageJson.version

try {
  const jsonSchema = z.toJSONSchema(zpressConfigSchema, {
    target: 'draft-7',
    unrepresentable: 'any',
  })

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://raw.githubusercontent.com/joggrdocs/zpress/v${currentVersion}/packages/config/schemas/schema.json`,
    title: 'Zpress Configuration',
    description: 'Configuration file for zpress documentation framework',
    ...jsonSchema,
  }

  const schemasDir = resolve(import.meta.dirname, '../schemas')
  mkdirSync(schemasDir, { recursive: true })

  const schemaPath = resolve(schemasDir, 'schema.json')
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2))

  console.log(`✓ Generated JSON Schema at ${schemaPath}`)
} catch (error) {
  console.error('✗ Failed to generate JSON Schema:')
  console.error(getErrorMessage(error))
  process.exit(1)
}

/**
 * Extract error message from unknown error value.
 */
// See https://github.com/joggrdocs/zpress/issues/73 — replace with shared toError util
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
