#!/usr/bin/env node
// Convert an SVG to a raster format (PNG / JPEG / WebP / AVIF) via sharp.
//
// Sharp reads the SVG, renders it via librsvg, and outputs to the requested
// raster format. Output defaults to a sibling file beside the input, with the
// extension swapped. Custom output path via --out.
//
// Usage:
//   node convert.mjs <input.svg> [--format png|jpeg|webp|avif]
//                                [--out <path>]
//                                [--width <px>]
//                                [--height <px>]
//                                [--density <dpi>]   # default 144 — bumps font crispness
//                                [--quality <0-100>] # for jpeg/webp/avif
//
// Notes:
//   - sharp is a peer dep — install with `node preflight.mjs --install` or
//     your package manager (`pnpm add -D sharp` / `npm install -D sharp`).
//   - For pixel-perfect text, embed webfonts as base64 inside the SVG via
//     <style>@font-face{...}</style>. librsvg falls back to system fonts
//     otherwise, which can shift glyph metrics across machines.
//
// Exit codes: 0 = success, 1 = conversion failed, 2 = bad invocation.
//
// SECURITY / THREAT MODEL:
//   This script renders SVG via librsvg (through sharp). librsvg has had
//   recurring issues with external resource loading and XML parsing
//   (file:// disclosure, http(s) SSRF, XXE, billion-laughs). We pre-strip
//   external href schemes before handing the document to sharp (see
//   sanitizeSvg() below) — this neutralizes the file:// / http(s):// SSRF
//   surface for <image href="..."> references but is NOT a full XML
//   sanitizer. DO NOT run this script on fully untrusted SVG input.
//   Trusted input = SVGs you authored, fetched from a source you control,
//   or reviewed by hand. Treat third-party SVG uploads as hostile.

import { readFileSync, statSync } from 'node:fs'
import { resolve, basename, extname, join, dirname } from 'node:path'

import { requireFromCwd } from './_resolve-from-cwd.mjs'

const FORMATS = new Set(['png', 'jpeg', 'webp', 'avif'])

const args = parseArgs(process.argv.slice(2))
if (!args.input) {
  usage()
  process.exit(2)
}

const input = resolve(args.input)
try {
  const s = statSync(input)
  if (!s.isFile()) throw new Error('not a file')
} catch (err) {
  console.error(`✗ cannot read ${args.input}: ${err.message}`)
  process.exit(2)
}
if (extname(input).toLowerCase() !== '.svg') {
  console.error(`✗ expected an .svg input, got ${extname(input)}`)
  process.exit(2)
}

const format = args.format ?? 'png'
if (!FORMATS.has(format)) {
  console.error(`✗ unsupported format: ${format} (allowed: ${[...FORMATS].join(', ')})`)
  process.exit(2)
}

const outPath = args.out
  ? resolve(args.out)
  : join(dirname(input), basename(input, '.svg') + '.' + format)

let sharp
try {
  sharp = requireFromCwd('sharp')
} catch {
  console.error('✗ sharp is not installed. Run:')
  console.error('    node ' + join(import.meta.dirname ?? '.', 'preflight.mjs') + ' --install')
  console.error('  or install manually:')
  console.error('    pnpm add -D sharp   # or: npm install -D sharp')
  process.exit(1)
}

let svgBuffer
try {
  // Read + sanitize in-memory so we hand sharp a Buffer, not a path. This
  // forces our pre-strip to run before librsvg sees any external href.
  const raw = readFileSync(input, 'utf8')
  svgBuffer = Buffer.from(sanitizeSvg(raw), 'utf8')
} catch (err) {
  console.error(`✗ cannot read ${args.input}: ${err.message}`)
  process.exit(1)
}

try {
  let pipe = sharp(svgBuffer, { density: args.density ?? 144 })
  if (args.width || args.height) {
    pipe = pipe.resize({
      width: args.width,
      height: args.height,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
  }
  switch (format) {
    case 'png':
      pipe = pipe.png({ compressionLevel: 9 })
      break
    case 'jpeg':
      pipe = pipe.jpeg({ quality: args.quality ?? 90, mozjpeg: true })
      break
    case 'webp':
      pipe = pipe.webp({ quality: args.quality ?? 90 })
      break
    case 'avif':
      pipe = pipe.avif({ quality: args.quality ?? 60 })
      break
  }
  const info = await pipe.toFile(outPath)
  const sizeKb = (info.size / 1024).toFixed(1)
  console.log(`✓ ${input} → ${outPath}`)
  console.log(`  ${info.width}×${info.height} ${format}, ${sizeKb} KB`)
} catch (err) {
  console.error(`✗ conversion failed: ${err.message}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------

// Neutralize external href references in an SVG document before handing it
// to librsvg. This blocks the obvious file:// disclosure / http(s) SSRF
// surface for <image href="..."> / xlink:href references. We KEEP data:
// URIs (legitimate inline raster, common usage) and relative paths
// (harmless and uncommon in convert-bound SVGs). We do not parse XML —
// regex is sufficient for stripping schemes from quoted attribute values.
function sanitizeSvg(content) {
  return content.replace(
    /(\b(?:xlink:)?href\s*=\s*["'])(?:file:|https?:|\/\/)[^"']*(["'])/gi,
    '$1about:blank$2'
  )
}

function parseArgs(argv) {
  const out = {
    input: null,
    format: null,
    out: null,
    width: null,
    height: null,
    density: null,
    quality: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--format' || a === '-f') out.format = next()
    else if (a === '--out' || a === '-o') out.out = next()
    else if (a === '--width' || a === '-w') out.width = Number(next())
    else if (a === '--height' || a === '-h') out.height = Number(next())
    else if (a === '--density') out.density = Number(next())
    else if (a === '--quality') out.quality = Number(next())
    else if (a === '--help') {
      usage()
      process.exit(0)
    } else if (a.startsWith('-')) {
      console.error(`✗ unknown flag: ${a}`)
      process.exit(2)
    } else if (!out.input) {
      out.input = a
    } else {
      console.error(`✗ unexpected positional arg: ${a}`)
      process.exit(2)
    }
  }
  return out
}

function usage() {
  console.error(
    'usage: convert.mjs <input.svg> [--format png|jpeg|webp|avif] [--out <path>] [--width <px>] [--height <px>] [--density <dpi>] [--quality <0-100>]'
  )
}
