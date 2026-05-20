# SVG Patterns

Recipe collection for shapes that recur across art assets. Every recipe sets
`viewBox="0 0 W H"` and draws content edge-to-edge — copy the math, don't
recreate it.

## GitHub repo banner (wide hero)

The default banner aspect for repo READMEs is roughly 5:1. `1280×256` is a
solid default — renders well on GitHub mobile and desktop, fits inside the
readable column on most themes. Bake the background fully — no transparent
margins.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 256" width="1280" height="256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7268F0"/>
      <stop offset="1" stop-color="#B667EF"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="256" fill="url(#bg)"/>
  <text x="64" y="148"
        font-family="Geist, system-ui, sans-serif" font-size="80" font-weight="700"
        fill="#FFFFFF">Title</text>
  <text x="64" y="196"
        font-family="'Geist Mono', monospace" font-size="20" fill="rgba(255,255,255,0.8)">subtitle</text>
</svg>
```

## Square badge / shield

Compact badge for status, version, license. 96–128 px square is plenty.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="16" fill="#7268F0"/>
  <text x="64" y="78" text-anchor="middle"
        font-family="'Geist Mono', monospace" font-size="22" font-weight="700"
        fill="#FFFFFF">v1</text>
</svg>
```

## Window chrome (IDE / app window)

A 660×420 IDE window. The window itself **is** the asset — no outer frame.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 420" width="660" height="420">
  <rect width="660" height="420" rx="10" fill="#1A1A1A" stroke="#2A2A2A" stroke-width="1.5"/>
  <rect width="660" height="36" rx="10" fill="#2A2A2A"/>
  <rect y="26" width="660" height="10" fill="#2A2A2A"/>
  <circle cx="28" cy="18" r="7" fill="#EF4444"/>
  <circle cx="50" cy="18" r="7" fill="#F59E0B"/>
  <circle cx="72" cy="18" r="7" fill="#10B981"/>
  <text x="330" y="22" text-anchor="middle"
        font-family="'Geist Mono', monospace" font-size="11" fill="#737373">filename.ext</text>
</svg>
```

The title bar and rounded corners share `rx=10`. The bottom rect
(`y=26 height=10`) covers the rounded bottom of the title bar so the divider
sits flush against the body.

## Terminal / CLI window

Same chrome, then a black-ish body with mono text. Use `xml:space="preserve"`
when leading whitespace matters (aligned prompts).

```svg
<rect y="36" width="660" height="384" fill="#0A0A0A"/>
<g font-family="'Geist Mono', monospace" font-size="12" xml:space="preserve">
  <text x="20" y="64" fill="#10B981">$ pnpm dev</text>
  <text x="20" y="86" fill="#9CA3AF">  ▶ started at http://localhost:3030</text>
</g>
```

## Rounded-rect "node" (for diagrams)

Brand-primary fill, white text, 12-px radius.

```svg
<g>
  <rect x="0" y="0" width="180" height="56" rx="12" fill="#7268F0"/>
  <text x="90" y="34" text-anchor="middle"
        font-family="Geist, system-ui, sans-serif" font-size="16" font-weight="600"
        fill="#FFFFFF">Step One</text>
</g>
```

## Arrow connector

Thin stroke + triangular arrowhead defined as a marker.

```svg
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="#9CA3AF"/>
  </marker>
</defs>
<line x1="180" y1="28" x2="320" y2="28"
      stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arrow)"/>
```

The marker's own viewBox is scoped — it doesn't affect the outer SVG viewBox.

## Icon glyph (96×96)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <circle cx="48" cy="48" r="44" fill="#7268F0"/>
  <path d="M30 50 L44 64 L66 38" stroke="#FFFFFF" stroke-width="6"
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

## Anti-patterns (don't do these)

**Offset viewBox to "center" content in a larger canvas:**

```svg
<!-- ✗ wrong: viewBox includes 120px of left padding -->
<svg viewBox="120 40 660 420" width="660" height="420">
  <rect x="120" y="40" width="660" height="420" .../>
</svg>
```

The lint catches this. Fix: drop offsets from both the viewBox and every child.

**Filter blur extending past the visible content:**
The viewBox crops it, so the shadow looks half-cut. Bake the shadow into a
shape (offset darker rect underneath), or leave shadowing to the consumer's
CSS `box-shadow`.

**Decorative outer 1-px border on a flush rect:**
A 1-px stroke at `x=0` renders half outside the viewBox. For a crisp 1-px
border flush to the asset edge, draw `x="0.5" y="0.5" width="W-1" height="H-1"`
with `stroke-width="1"`.
