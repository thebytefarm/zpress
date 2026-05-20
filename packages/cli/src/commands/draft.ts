import fs from 'node:fs/promises'
import path from 'node:path'

import { command } from '@kidd-cli/core'
import { createRegistry, render, toSlug } from '@zpress/templates'
import type { Template } from '@zpress/templates'
import { match, P } from 'massaman/match'
import { z } from 'zod'

const registry = createRegistry()

/**
 * Scaffold a new documentation file from a template.
 *
 * Prompts for the doc type and title when not provided via args,
 * then writes the rendered template to the specified output directory.
 */
export default command({
  name: 'draft',
  description: 'Scaffold a new documentation file from a template',
  options: z.object({
    type: z.string().optional(),
    title: z.string().optional(),
    out: z.string().optional().default('.'),
  }),
  handler: async (ctx) => {
    ctx.log.intro('zpress draft')

    const typeArg = ctx.args.type
    const hasValidType = match(typeArg)
      .with(P.string.minLength(1), (t) => registry.has(t))
      .otherwise(() => false)

    const selectedType: string = await match(hasValidType)
      .with(true, () => Promise.resolve(typeArg as string))
      .otherwise(() =>
        ctx.prompts.select<string>({
          message: 'Select a doc type',
          options: registry.list().map((t: Template) => ({
            value: t.type,
            label: t.label,
            hint: t.hint,
          })),
        })
      )

    const template = registry.get(selectedType)
    if (!template) {
      ctx.log.error(`Unknown template type: ${selectedType}`)
      return
    }

    const title = await match(ctx.args.title)
      .with(P.string.minLength(1), (t) => Promise.resolve(t))
      .otherwise(() =>
        ctx.prompts.text({
          message: 'Document title',
          placeholder: 'e.g. Authentication',
          validate: (value): string | undefined => {
            if (!value || value.trim().length === 0) {
              return 'Title is required'
            }
          },
        })
      )

    const slug = toSlug(title)
    if (slug.length === 0) {
      ctx.log.error('Title must include at least one letter or number')
      return
    }

    const content = render(template, { title })
    const filename = `${slug}.md`
    const outDir = path.resolve(process.cwd(), ctx.args.out)
    const filePath = path.join(outDir, filename)

    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      ctx.log.error(`File already exists: ${path.relative(process.cwd(), filePath)}`)
      return
    }

    await fs.mkdir(outDir, { recursive: true })
    await fs.writeFile(filePath, content, 'utf8')

    ctx.log.success(`Created ${path.relative(process.cwd(), filePath)}`)
    ctx.log.outro('Done')
  },
})
