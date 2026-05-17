# Color Reference for SVG Assets

Standalone SVGs cannot read CSS variables — colors must be hardcoded as hex.
This file is a starting palette. Override per-project as needed; what matters
is _consistency within a single category_ (e.g., all banners share a palette).

## Default brand-leaning palette

| Role      | Hex       | Use                          |
| --------- | --------- | ---------------------------- |
| Primary   | `#7268F0` | Main accent, calls to action |
| Secondary | `#B667EF` | Gradients, decorative        |
| Accent    | `#0097A7` | Tertiary accent, info        |
| Highlight | `#EEFF41` | High-impact callouts         |

## Dark surfaces (default backgrounds)

| Role           | Hex                   |
| -------------- | --------------------- |
| Background     | `#020202`             |
| Surface        | `#0A0A0A` / `#111111` |
| Border subtle  | `#1A1A1A`             |
| Border default | `#2A2A2A`             |

## Light surfaces

| Role       | Hex       |
| ---------- | --------- |
| Background | `#FFFFFF` |
| Surface    | `#F4F4F5` |
| Border     | `#E4E4E7` |

## Text

| Role                | Hex       |
| ------------------- | --------- |
| On dark — primary   | `#FFFFFF` |
| On dark — secondary | `#E9E9E9` |
| On dark — muted     | `#9CA3AF` |
| On light — primary  | `#111111` |
| On light — muted    | `#6B7280` |

## Status

| Role    | Hex       |
| ------- | --------- |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Error   | `#EF4444` |

## Mac traffic-light palette (for window chrome)

| Light            | Hex       |
| ---------------- | --------- |
| Red (close)      | `#EF4444` |
| Amber (minimize) | `#F59E0B` |
| Green (maximize) | `#10B981` |

## Typography

- **Sans:** `system-ui, sans-serif` (or `Geist, system-ui, sans-serif` if Geist is available system-wide).
- **Mono:** `'Geist Mono', 'SF Mono', 'Fira Code', monospace`.

Playwright's renderer falls back to the system font when the named font is
missing, and at 2× scale the fallback is barely distinguishable. If the asset
must be pixel-identical across machines, embed a webfont via `<style>` inside
the SVG using `@font-face` with a base64-encoded payload.

## Spacing rhythm

Stick to multiples of 4 (4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80)
for any internal padding within a composition so visuals line up cleanly when
combined.
