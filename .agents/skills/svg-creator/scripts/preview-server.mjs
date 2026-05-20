#!/usr/bin/env node
// Local HTTP preview for a single SVG asset.
//
// Picks a free port from a small pool of uncommon defaults (so it doesn't
// clash with the usual dev servers), falls back to an OS-assigned port if all
// pool ports are bound. Serves an HTML page with the SVG inlined directly
// into the document (rather than served as a top-level image/svg+xml
// response) so browsers never execute scripts inside the asset.
//
// Designed to be navigable by the chrome-devtools MCP — the agent can spawn
// this in background, navigate_page to the printed URL, then take_screenshot
// or evaluate_script to verify the SVG renders correctly before declaring
// the asset done.
//
// Usage:
//   node preview-server.mjs <path-to-svg>
//
// Exit codes: 0 = listening (foreground until killed), 2 = bad invocation.

import { readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { resolve, basename, extname } from 'node:path'

const PREFERRED_PORTS = [5879, 6321, 7843, 8765, 9876, 31415, 42420, 47821, 51234, 61234]

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('usage: preview-server.mjs <path-to-svg>')
  process.exit(2)
}

const svgPath = resolve(args[0])
try {
  const s = statSync(svgPath)
  if (!s.isFile()) throw new Error('not a file')
} catch (err) {
  console.error(`✗ cannot read ${args[0]}: ${err.message}`)
  process.exit(2)
}
if (extname(svgPath).toLowerCase() !== '.svg') {
  console.error(`✗ expected an .svg file, got ${extname(svgPath)}`)
  process.exit(2)
}

const port = await pickPort()

// Read the SVG once at startup: avoids per-request sync I/O on the event
// loop, and lets us inline the source directly into the HTML response.
const svgSource = readFileSync(svgPath, 'utf8')
const svgDims = extractDims(svgSource)
const htmlBody = renderHtml(basename(svgPath), svgSource, svgDims)

const server = createServer((req, res) => {
  try {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(htmlBody)
    } else if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
    } else {
      res.writeHead(404).end('not found')
    }
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' })
    res.end(`error: ${err.message}`)
  }
})

server.listen(port, '127.0.0.1', () => {
  const addr = server.address()
  const actual = typeof addr === 'object' && addr ? addr.port : port
  console.log(`✓ preview ready at http://localhost:${actual}/`)
  console.log(`  serving ${svgPath}`)
  console.log(`  endpoints: /  /health`)
})

server.on('error', (err) => {
  console.error(`✗ server error: ${err.message}`)
  process.exit(1)
})

// ---------------------------------------------------------------------------

function pickPort() {
  return new Promise((resolvePort) => {
    const tryAt = (i) => {
      if (i >= PREFERRED_PORTS.length) return resolvePort(0) // OS picks
      const candidate = PREFERRED_PORTS[i]
      const probe = createNetServer()
      probe.once('error', () => tryAt(i + 1))
      probe.once('listening', () => {
        probe.close(() => resolvePort(candidate))
      })
      probe.listen(candidate, '127.0.0.1')
    }
    tryAt(0)
  })
}

function extractDims(svg) {
  const tag = svg.match(/<svg\b[^>]*>/i)
  if (!tag) return { w: '?', h: '?' }
  const vb = tag[0].match(/\bviewBox\s*=\s*"([^"]+)"/i)
  if (vb) {
    const parts = vb[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { w: parts[2], h: parts[3] }
    }
  }
  const w = tag[0].match(/\bwidth\s*=\s*"([^"]+)"/i)
  const h = tag[0].match(/\bheight\s*=\s*"([^"]+)"/i)
  return { w: w ? w[1] : '?', h: h ? h[1] : '?' }
}

function renderHtml(name, svgSource, dims) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(name)} — svg preview</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #0a0a0a; color: #fafafa; font: 13px/1.5 system-ui, sans-serif; margin: 0; padding: 24px; }
    header { margin-bottom: 16px; }
    h1 { margin: 0 0 4px; font-size: 15px; font-weight: 600; }
    .meta { color: #9CA3AF; font-size: 12px; }
    .meta a { color: #7268F0; text-decoration: none; }
    .meta a:hover { text-decoration: underline; }
    .stage {
      display: inline-block;
      background-image:
        linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
        linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .stage svg { display: block; max-width: 90vw; height: auto; }
    section h2 { font-size: 13px; color: #9CA3AF; margin: 0 0 8px; font-weight: 500; }
    pre { background: #111; color: #e9e9e9; padding: 16px; border-radius: 6px; overflow: auto; max-width: 110ch; font: 12px/1.5 ui-monospace, 'SF Mono', monospace; margin: 0; }
  </style>
</head>
<body>
  <header>
    <h1>${esc(name)}</h1>
    <div class="meta">${esc(String(dims.w))} × ${esc(String(dims.h))}</div>
  </header>
  <div class="stage" id="stage">
    ${svgSource}
  </div>
  <section>
    <h2>Source</h2>
    <pre><code>${esc(svgSource)}</code></pre>
  </section>
</body>
</html>`
}

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  )
}
