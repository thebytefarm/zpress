import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { z } from 'zod'

import { zpressConfigSchema } from '../src/schema.ts'

const packageJsonPath = resolve(import.meta.dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string }
const currentVersion = packageJson.version

try {
  const rawJsonSchema = z.toJSONSchema(zpressConfigSchema, {
    target: 'draft-7',
    unrepresentable: 'any',
  })
  const jsonSchema = applyTupleLengthBounds(rawJsonSchema) as Record<string, unknown>

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
 * Walk the generated JSON Schema tree and add `minItems` / `maxItems` to
 * every tuple item — JSON Schema draft-07 represents tuples as `items: [
 * ...positional schemas]`, but Zod's `toJSONSchema` emits the positional
 * array without length constraints. Without these, IDEs accept malformed
 * arrays that the matching Zod runtime validator rejects.
 *
 * The walk is non-destructive — returns a new tree rather than mutating
 * the input.
 */
function applyTupleLengthBounds(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(applyTupleLengthBounds)
  }
  if (node === null || typeof node !== 'object') {
    return node
  }
  const record = node as Record<string, unknown>
  const { items } = record
  if (Array.isArray(items)) {
    const { length } = items
    return {
      ...Object.fromEntries(Object.entries(record).map(([k, v]) => [k, applyTupleLengthBounds(v)])),
      minItems: length,
      maxItems: length,
    }
  }
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, applyTupleLengthBounds(v)]))
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
