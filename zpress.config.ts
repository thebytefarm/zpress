import { defineConfig, defineTheme } from '@zpress/kit'

// TEST: remove before merge — sample custom theme registered via `defineTheme`
// from `@zpress/kit`. Verifies that the design-system pipeline (config →
// theme registry → `__ZPRESS_THEME_REGISTRY__` define → inline `<style>` tag)
// works end-to-end for user-supplied themes. The token tree below is a sunset
// recast of the built-in `arcade` palette — full token coverage is required
// because `tokensSchema` (in `@zpress/theme`) is `.strict()`.
const sunsetTheme = defineTheme({
  name: 'sunset',
  defaultVariant: 'dark',
  variants: {
    dark: {
      colors: {
        brand: {
          primary: '#ff7a3d',
          hover: '#ff8c54',
          active: '#e65f24',
          fg: '#2a0f06',
          soft: 'rgba(255, 122, 61, 0.14)',
          onBrand: '#2a0f06',
          light: '#ffa56a',
          lighter: '#ffc89a',
        },
        semantic: {
          success: '#16a34a',
          error: '#dc2626',
          warn: '#d97706',
          info: '#2563eb',
          muted: '#888888',
        },
        surface: {
          bg: '#1a0f0a',
          bgAlt: '#22140d',
          bgElv: '#2b1a11',
          bgSoft: '#341f15',
          bgIcon: '#4a2e1f',
          homeBg: '#1a0f0a',
          overlayFaint: 'rgba(255, 168, 122, 0.10)',
          gutter: '#22140d',
          codeBlockBg: '#22140d',
        },
        text: {
          text1: '#ffe8d6',
          text2: 'rgba(255, 232, 214, 0.72)',
          text3: 'rgba(255, 232, 214, 0.48)',
        },
        border: {
          border: '#5a3520',
          divider: '#3a2114',
          sidebarAltBorderDark: '#5a3520',
        },
        tint: {
          purple: { bg: 'rgba(167, 139, 250, 0.12)', fg: '#a78bfa' },
          blue: { bg: 'rgba(96, 165, 250, 0.12)', fg: '#60a5fa' },
          green: { bg: 'rgba(52, 211, 153, 0.12)', fg: '#34d399' },
          amber: { bg: 'rgba(251, 191, 36, 0.12)', fg: '#fbbf24' },
          red: { bg: 'rgba(248, 113, 113, 0.12)', fg: '#f87171' },
          slate: { bg: 'rgba(148, 163, 184, 0.12)', fg: '#94a3b8' },
          cyan: { bg: 'rgba(14, 165, 233, 0.12)', fg: '#0ea5e9' },
          pink: { bg: 'rgba(244, 114, 182, 0.12)', fg: '#f472b6' },
          purpleBright: { fg: '#c084fc' },
          amberBright: { fg: '#fcd34d' },
          purpleGlow: 'rgba(255, 168, 122, 0.10)',
        },
        terminal: {
          bg: '#1a0f0a',
          titlebarBg: '#22140d',
          border: '#3a2114',
          title: '#a87854',
          text: '#ffe8d6',
          promptPrefix: '#a87854',
          output: '#caa888',
          red: '#f87171',
          green: '#4ade80',
          blue: '#60a5fa',
          yellow: '#fbbf24',
          cyan: '#22d3ee',
          magenta: '#c084fc',
          white: '#ffe8d6',
          gray: '#a87854',
          success: '#4ade80',
          error: '#f87171',
          warn: '#fbbf24',
          info: '#60a5fa',
          muted: '#a87854',
          bar: '#a87854',
          step: '#ff7a3d',
        },
        window: {
          dotClose: '#ff5f57',
          dotMinimize: '#febc2e',
          dotMaximize: '#28c840',
          titleFallback: '#a87854',
        },
        badge: {
          info: { bg: 'rgba(37, 99, 235, 0.12)', fg: '#2563eb' },
          success: { bg: 'rgba(16, 185, 129, 0.12)', fg: '#059669' },
          warning: { bg: 'rgba(217, 119, 6, 0.12)', fg: '#d97706' },
          error: { bg: 'rgba(220, 38, 38, 0.12)', fg: '#dc2626' },
        },
        scrollbar: {
          thumb: '#4a2e1f',
          thumbHover: '#5a3520',
        },
        syntax: {
          kw: '#ff7a3d',
          str: '#fcd34d',
          fn: '#60a5fa',
        },
        gradient: {
          heroCyan: '#06b6d4',
          heroPurple: '#a855f7',
        },
        oas: {
          get: '#4ade80',
          post: '#60a5fa',
          put: '#fbbf24',
          patch: '#fbbf24',
          delete: '#f87171',
          deprecated: 'var(--zp-c-text-3)',
          required: '#f87171',
        },
        button: {
          brand: {
            bg: '#e65f24',
            hoverBg: '#ff7a3d',
            activeBg: '#cc5320',
            text: '#2a0f06',
          },
        },
      },
      spacing: {
        s1: '1px',
        s2: '2px',
        s3: '3px',
        s4: '4px',
        s5: '5px',
        s6: '6px',
        s8: '8px',
        s10: '10px',
        s12: '12px',
        s14: '14px',
        s16: '16px',
        s18: '18px',
        s20: '20px',
        s24: '24px',
        s28: '28px',
        s32: '32px',
        s40: '40px',
        s48: '48px',
        s56: '56px',
        s64: '64px',
        s72: '72px',
        s96: '96px',
      },
      radii: {
        xs: '2px',
        xsSm: '3px',
        sm: '4px',
        mdSm: '6px',
        md: '8px',
        lg: '10px',
        mdLg: '12px',
        pill: '9999px',
      },
      fonts: {
        family: {
          sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
          mono: "'Geist Mono', ui-monospace, 'SFMono-Regular', monospace",
        },
        weight: {
          regular: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        size: {
          body: '16px',
          btn: '14px',
          bullet: '14px',
          code: '13px',
          eyebrow: '11px',
          tagline: '18px',
          heroTitle: 'clamp(40px, 6.5vw, 76px)',
          splitTitle: 'clamp(28px, 4vw, 40px)',
          featureTitle: '18px',
          featureDesc: '16px',
          featureLink: '12px',
          sectionTitle: '14px',
          sectionDesc: '12.5px',
          badge: '11px',
          tooltip: '13px',
          tooltipHeadline: '13px',
          tooltipCta: '12px',
          check: '11px',
          fieldName: '14px',
          fieldType: '11px',
          fieldBadge: '11px',
          fieldDefault: '12px',
          fieldDefaultCode: '11px',
          fieldBody: '14px',
          fieldGroupTitle: '14px',
          fieldTrigger: '12px',
          promptDesc: '14px',
          promptFeedback: '12px',
          promptBtn: '12px',
          promptMenuItem: '13px',
          promptMenuDesc: '11px',
          colorName: '12px',
          colorValue: '11px',
          windowTitle: '12px',
          windowTab: '12px',
          windowUrl: '11px',
          termBody: '13px',
          demoTitle: '11px',
          demoBody: '13px',
          askAi: '13px',
          askAiMark: '10px',
          askAiShortcut: '10px',
          sidebarLink: '14px',
        },
      },
      shadows: {
        cardHover: '0 2px 12px var(--zp-c-tint-purple-glow)',
        menu: '0 8px 24px rgba(0, 0, 0, 0.12)',
        tooltip: '0 4px 12px rgba(0, 0, 0, 0.08)',
        heroDemo:
          '0 0 0 1px rgba(0, 0, 0, 0.5), 0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 80px var(--zp-c-brand-soft)',
        askAi: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(0, 0, 0, 0.5)',
      },
      motion: {
        duration: { fast: '0.15s', base: '0.2s' },
        easing: { base: 'ease' },
      },
      zIndex: {
        dropdown: 50,
        floating: 60,
        tooltip: 100,
      },
      lineHeights: {
        display: '1',
        tight: '1.4',
        tighter: '1.3',
        snug: '1.45',
        base: '1.5',
        relaxed: '1.6',
        demo: '1.65',
        code: '1.7',
        sidebar: '24px',
      },
      letterSpacings: {
        wide: '0.02em',
        eyebrow: '0.1em',
        display: '-0.025em',
        hero: '-0.04em',
      },
      opacities: {
        muted: '0.5',
        deprecated: '0.6',
        hover: '0.8',
      },
      sizes: {
        titlebar: '36px',
        windowDot: '10px',
        windowTabDot: '6px',
        browserTabMax: '200px',
        browserIcon: '14px',
        browserUrlbar: '28px',
        iconBox: '36px',
        iconBoxSm: '28px',
        iconSvg: '18px',
        iconSvgSm: '16px',
        iconSm: '16px',
        contentMax: '1152px',
        focusRing: '2px',
        focusRingOffset: '2px',
        tooltipMax: '320px',
        swatch: '24px',
        demoMax: '920px',
        splitMax: '1200px',
        heroGrid: '24px',
        heroMax: '1100px',
        taglineMax: '640px',
        promptIcon: '20px',
        promptBtn: '30px',
        menuMin: '220px',
        promptMenuIcon: '18px',
        check: '18px',
        chevron: '14px',
        askAiIcon: '18px',
        sidebarCircle: '36px',
        scrollbar: '6px',
      },
      breakpoints: {
        sm: '768px',
        md: '720px',
        mdLg: '880px',
        content: '1184px',
      },
      blurs: { base: '8px' },
      gradients: {
        brand: 'linear-gradient(135deg, var(--zp-c-brand-1), var(--zp-c-brand-3))',
        heroTitle: 'linear-gradient(135deg, var(--zp-c-brand-1), var(--zp-c-brand-light))',
      },
    },
  },
})

export default defineConfig({
  title: 'zpress',
  description: 'Beautiful Docs, Zero Effort',
  tagline:
    'An opinionated documentation framework for monorepos. No restructuring, no plugins, no theme wiring — just point it at your markdown.',
  theme: {
    name: 'midnight',
    switcher: true,
  },
  // TEST: remove before merge — registers `sunset` as a 4th custom theme
  // so the theme switcher displays 4 entries (base, midnight, arcade, sunset).
  themes: [sunsetTheme],
  site: {
    version: 'v1.0',
    topbarCta: { text: 'Get started →', href: '/getting-started/quick-start' },
    edit: { repo: 'joggrdocs/zpress', branch: 'main', directory: 'docs' },
    report: { repo: 'joggrdocs/zpress' },
    sidebarPromo: {
      title: 'Ship docs that stay in sync',
      body: 'Pull docs from your codebase and keep them green automatically.',
      cta: { text: 'Try Joggr →', href: 'https://joggr.io' },
    },
    announcement: {
      id: 'zpress-1.0',
      lead: 'zpress 1.0',
      message: 'is shipping soon · early-access program now open',
      cta: { href: '/getting-started/quick-start', label: 'Get on the list' },
    },
    footer: {
      tagline: 'built on Rspress · powered by Joggr',
      columns: [
        {
          heading: 'Docs',
          links: [
            { text: 'Quickstart', href: '/getting-started/quick-start' },
            { text: 'Guides', href: '/guides' },
            { text: 'Reference', href: '/reference/configuration' },
          ],
        },
        {
          heading: 'Community',
          links: [
            { text: 'GitHub', href: 'https://github.com/joggrdocs/zpress' },
            { text: 'npm', href: 'https://www.npmjs.com/package/@zpress/kit' },
          ],
        },
      ],
    },
  },
  home: {
    features: { truncate: { description: 2 } },
    // Landing-page extensions (mockup parity)
    eyebrow: '★ open source · v0.5 · MIT',
    trust: {
      lead: 'used by docs at',
      names: ['Joggr', 'Healthie', 'Kindred', 'ButterflyMX', 'Discovery Education'],
    },
    cta: {
      title: 'Ship the docs your team deserves.',
      subtitle: 'One CLI. Three minutes. Production-ready.',
      actions: [
        { theme: 'brand', text: 'Get started', link: '/getting-started/quick-start' },
        { theme: 'alt', text: 'Star on GitHub →', link: 'https://github.com/joggrdocs/zpress' },
      ],
    },
  },
  sidebar: {
    above: [
      { text: 'Home', link: '/', icon: 'pixelarticons:home' },
      { text: 'Changelog', link: '/changelog', icon: 'pixelarticons:notes' },
    ],
    below: [{ text: 'Contributing', link: '/contributing', icon: 'pixelarticons:git-merge' }],
  },
  actions: [
    { theme: 'brand', text: 'Introduction', link: '/getting-started/introduction' },
    { theme: 'alt', text: 'Quick Start', link: '/getting-started/quick-start' },
  ],
  features: [
    {
      title: 'Zero Effort',
      description: 'No restructuring, no plugins, no theme wiring. Point it at markdown and ship.',
      icon: 'pixelarticons:speed-fast',
    },
    {
      title: 'Your Structure',
      description: 'Config maps to how you already organize markdown. The tool fits your docs.',
      icon: 'pixelarticons:layout',
    },
    {
      title: 'AI-Friendly',
      description:
        'Auto llms.txt generation, raw markdown served as text/markdown, and glob discovery that picks up new files without config changes.',
      icon: 'pixelarticons:robot',
    },
    {
      title: 'Monorepo Native',
      description: 'First-class workspace support with standalone sidebars and landing pages.',
      icon: 'pixelarticons:git-merge',
    },
    {
      title: 'VSCode Extension',
      description: 'Preview your docs site directly inside VS Code as you write.',
      icon: 'simple-icons:visualstudiocode',
    },
    {
      title: 'OpenAPI Support',
      description:
        'Drop in an OpenAPI spec and get interactive API reference pages with try-it-out requests.',
      icon: 'simple-icons:openapiinitiative',
    },
  ],
  packages: [
    {
      title: '@zpress/kit',
      icon: { id: 'pixelarticons:archive', color: 'purple' },
      description:
        'Documentation framework powered by Rspress with a config-driven information architecture',
      tags: ['typescript', 'node'],
      path: '/packages/zpress',
      items: [
        { title: 'Overview', path: '/packages/zpress', include: 'packages/zpress/README.md' },
        {
          title: 'Changelog',
          path: '/packages/zpress/changelog',
          include: 'packages/zpress/CHANGELOG.md',
        },
      ],
    },
    {
      title: '@zpress/cli',
      icon: { id: 'pixelarticons:terminal', color: 'green' },
      description: 'CLI for building and serving zpress documentation sites',
      tags: ['typescript', 'node'],
      path: '/packages/cli',
      items: [
        { title: 'Overview', path: '/packages/cli', include: 'packages/cli/README.md' },
        {
          title: 'Changelog',
          path: '/packages/cli/changelog',
          include: 'packages/cli/CHANGELOG.md',
        },
      ],
    },
    {
      title: '@zpress/config',
      icon: { id: 'pixelarticons:sliders', color: 'amber' },
      description: 'Configuration loading and validation for zpress',
      tags: ['typescript', 'zod'],
      path: '/packages/config',
      items: [
        { title: 'Overview', path: '/packages/config', include: 'packages/config/README.md' },
        {
          title: 'Changelog',
          path: '/packages/config/changelog',
          include: 'packages/config/CHANGELOG.md',
        },
      ],
    },
    {
      title: '@zpress/ui',
      icon: { id: 'pixelarticons:paint-bucket', color: 'pink' },
      description: 'Rspress plugin, theme components, and styles for zpress',
      tags: ['typescript', 'react'],
      path: '/packages/ui',
      items: [
        { title: 'Overview', path: '/packages/ui', include: 'packages/ui/README.md' },
        {
          title: 'Changelog',
          path: '/packages/ui/changelog',
          include: 'packages/ui/CHANGELOG.md',
        },
      ],
    },
    {
      title: '@zpress/theme',
      icon: { id: 'pixelarticons:mood-happy', color: 'cyan' },
      description: 'Theme types and definitions for zpress',
      tags: ['typescript'],
      path: '/packages/theme',
      items: [
        { title: 'Overview', path: '/packages/theme', include: 'packages/theme/README.md' },
        {
          title: 'Changelog',
          path: '/packages/theme/changelog',
          include: 'packages/theme/CHANGELOG.md',
        },
      ],
    },
    {
      title: '@zpress/templates',
      icon: { id: 'pixelarticons:note', color: 'slate' },
      description:
        'Documentation templates SDK — built-in templates, extensions, and custom registrations',
      tags: ['typescript', 'liquid'],
      path: '/packages/templates',
    },
  ],
  openapi: {
    spec: 'docs/examples/petstore.json',
    path: '/petstore',
    title: 'Petstore API',
  },
  sections: [
    {
      title: 'Getting Started',
      description: 'Set up zpress and ship your first documentation site in minutes.',
      icon: 'pixelarticons:speed-fast',
      path: '/getting-started',
      landing: true,
      items: [
        {
          title: 'Introduction',
          description: 'What zpress is, why it exists, and what it gives you out of the box.',
          path: '/getting-started/introduction',
          include: 'docs/getting-started/introduction.mdx',
        },
        {
          title: 'Quick Start',
          description: 'Install zpress and create your first documentation site in minutes.',
          path: '/getting-started/quick-start',
          include: 'docs/getting-started/quick-start.md',
        },
      ],
    },
    {
      title: 'Concepts',
      description: 'Core ideas behind how zpress organizes and renders documentation.',
      icon: 'pixelarticons:book-open',
      path: '/concepts',
      landing: true,
      items: [
        {
          title: 'Content',
          description: 'How sections and pages define your information architecture.',
          path: '/concepts/content',
          include: 'docs/concepts/content.md',
        },
        {
          title: 'Navigation',
          description: 'How the top nav bar and auto-generated landing pages control discovery.',
          path: '/concepts/navigation',
          include: 'docs/concepts/navigation.md',
        },
        {
          title: 'Workspaces',
          description: 'Monorepo support with standalone sidebars and landing page cards.',
          path: '/concepts/workspaces',
          include: 'docs/concepts/workspaces.md',
        },
        {
          title: 'Themes',
          description: 'Built-in themes, color modes, and color token overrides.',
          path: '/concepts/themes',
          include: 'docs/concepts/themes.mdx',
        },
        {
          title: 'LLM Output',
          description: 'Structured text output for LLMs, AI agents, and programmatic consumers.',
          path: '/concepts/llm-output',
          include: 'docs/concepts/llm-output.md',
        },
      ],
    },
    {
      title: 'Guides',
      description: 'Step-by-step instructions for deploying and configuring your site.',
      icon: 'pixelarticons:bookmark',
      path: '/guides',
      landing: true,
      items: [
        {
          title: 'Deploy to Vercel',
          description: 'Build and deploy your zpress site to Vercel static hosting.',
          path: '/guides/deploying-to-vercel',
          include: 'docs/guides/deploying-to-vercel.md',
        },
        {
          title: 'Deploy to GitHub Pages',
          description: 'Build and deploy your zpress site with GitHub Actions.',
          path: '/guides/deploying-to-github-pages',
          include: 'docs/guides/deploying-to-github-pages.md',
        },
      ],
    },
    {
      title: 'Framework',
      description: 'An opinionated approach to documentation organization, inspired by Diataxis.',
      icon: 'pixelarticons:notes',
      path: '/framework',
      landing: true,
      items: [
        {
          title: 'Overview',
          description: 'Why documentation needs structure and how zpress maps to Diataxis.',
          path: '/framework/overview',
          include: 'docs/framework/overview.md',
        },
        {
          title: 'Types',
          description: 'The seven documentation types and when to use each one.',
          path: '/framework/types',
          include: 'docs/framework/types.md',
        },
        {
          title: 'Recommended',
          description: 'The recommended section layout for a zpress documentation site.',
          path: '/framework/recommended',
          include: 'docs/framework/recommended.md',
        },
        {
          title: 'Templates',
          description: 'Starter templates for each documentation type.',
          path: '/framework/templates',
          include: 'docs/framework/templates.md',
          items: [
            {
              title: 'Concept',
              description: 'Copy-paste template for concept (explanation) documentation.',
              path: '/framework/templates/concept',
              include: 'docs/framework/templates/concept.md',
            },
            {
              title: 'Guide',
              description: 'Copy-paste template for how-to guide documentation.',
              path: '/framework/templates/guide',
              include: 'docs/framework/templates/guide.md',
            },
          ],
        },
        {
          title: 'Scaling',
          description: 'How to evolve your documentation structure as your project grows.',
          path: '/framework/scaling',
          include: 'docs/framework/scaling.md',
        },
      ],
    },
    {
      title: 'Reference',
      description: 'Technical reference for every zpress API surface.',
      icon: 'pixelarticons:list-box',
      path: '/reference',
      landing: true,
      sort: (a, b) => {
        if (a.title === 'Configuration') {
          return -1
        }
        if (b.title === 'Configuration') {
          return 1
        }
        return a.title.localeCompare(b.title)
      },
      items: [
        {
          title: 'Configuration',
          description: 'Complete reference for all zpress.config.ts fields and entry shapes.',
          path: '/reference/configuration',
          include: 'docs/references/configuration.md',
        },
        {
          title: 'CLI Commands',
          description: 'All zpress CLI commands, flags, and behavior.',
          path: '/reference/cli',
          include: 'docs/references/cli.md',
        },
        {
          title: 'Frontmatter Fields',
          description: 'Every frontmatter field supported by zpress pages.',
          path: '/reference/frontmatter',
          include: 'docs/references/frontmatter.md',
        },
        {
          title: 'VSCode Extension',
          description: 'Preview your zpress docs site directly inside VS Code.',
          path: '/reference/vscode-extension',
          include: 'docs/references/vscode-extension.md',
        },
        {
          title: 'OpenAPI',
          description: 'Generate interactive API reference pages from an OpenAPI spec.',
          path: '/reference/openapi',
          include: 'docs/references/openapi.mdx',
        },
        {
          title: 'Built-ins',
          description: 'Components, diagrams, and markdown extensions included out of the box.',
          path: '/reference/built-ins',
          sort: 'none',
          items: [
            // Layout & Structure
            {
              title: 'Accordion',
              description: 'Expandable disclosure sections for progressive content reveal.',
              path: '/reference/built-ins/accordion',
              include: 'docs/references/built-ins/accordion.mdx',
            },
            {
              title: 'Cards',
              description: 'Card components for landing pages, feature grids, and indexes.',
              path: '/reference/built-ins/cards',
              include: 'docs/references/built-ins/cards.mdx',
            },
            {
              title: 'Columns',
              description: 'Responsive grid layout for side-by-side content.',
              path: '/reference/built-ins/columns',
              include: 'docs/references/built-ins/columns.mdx',
            },
            {
              title: 'Field',
              description: 'Structured parameter and field documentation with nesting.',
              path: '/reference/built-ins/field',
              include: 'docs/references/built-ins/field.mdx',
            },
            {
              title: 'Frame',
              description: 'Media wrapper for images and videos with captions.',
              path: '/reference/built-ins/frame',
              include: 'docs/references/built-ins/frame.mdx',
            },
            {
              title: 'Steps',
              description: 'Vertical timeline stepper for sequential instructions.',
              path: '/reference/built-ins/steps',
              include: 'docs/references/built-ins/steps.mdx',
            },
            // Window Chrome
            {
              title: 'Desktop Window',
              description: 'macOS-style window chrome that all window components build on.',
              path: '/reference/built-ins/desktop-window',
              include: 'docs/references/built-ins/desktop-window.mdx',
            },
            {
              title: 'Browser Window',
              description: 'Wrap content in a fake browser chrome frame.',
              path: '/reference/built-ins/browser-window',
              include: 'docs/references/built-ins/browser-window.mdx',
            },
            {
              title: 'IDE Window',
              description: 'Editor-style window with file tabs for code blocks.',
              path: '/reference/built-ins/ide-window',
              include: 'docs/references/built-ins/ide-window.mdx',
            },
            {
              title: 'Terminal Window',
              description: 'Render terminal sessions with commands, outputs, and colored text.',
              path: '/reference/built-ins/terminal-window',
              include: 'docs/references/built-ins/terminal-window.mdx',
            },
            // Inline Elements
            {
              title: 'Badge',
              description: 'Inline labels with semantic variants and custom colors.',
              path: '/reference/built-ins/badge',
              include: 'docs/references/built-ins/status-badge.mdx',
            },
            {
              title: 'Color',
              description: 'Color swatch display with click-to-copy.',
              path: '/reference/built-ins/color',
              include: 'docs/references/built-ins/color.mdx',
            },
            {
              title: 'Tooltip',
              description: 'Hover-to-reveal definitions for inline contextual help.',
              path: '/reference/built-ins/tooltip',
              include: 'docs/references/built-ins/tooltip.mdx',
            },
            // Code & Prompts
            {
              title: 'Code Blocks',
              description: 'Syntax highlighting, line numbers, diffs, and code block features.',
              path: '/reference/built-ins/code-blocks',
              include: 'docs/references/built-ins/code-blocks.md',
            },
            {
              title: 'Prompt',
              description: 'Copyable AI prompt blocks with sparkle icon.',
              path: '/reference/built-ins/prompt',
              include: 'docs/references/built-ins/prompt.mdx',
            },
            // Diagrams & Visualizations
            {
              title: 'File Tree',
              description: 'Render interactive file tree visualizations.',
              path: '/reference/built-ins/file-tree',
              include: 'docs/references/built-ins/file-tree.md',
            },
            {
              title: 'Mermaid Diagrams',
              description: 'Render diagrams from text using Mermaid fenced code blocks.',
              path: '/reference/built-ins/mermaid',
              include: 'docs/references/built-ins/mermaid.md',
            },
            // Markdown Extensions
            {
              title: 'Math (KaTeX)',
              description: 'Render LaTeX math expressions inline and in blocks.',
              path: '/reference/built-ins/math',
              include: 'docs/references/built-ins/math.md',
            },
            {
              title: 'Superscript & Subscript',
              description: 'Inline superscript and subscript syntax.',
              path: '/reference/built-ins/superscript-subscript',
              include: 'docs/references/built-ins/superscript-subscript.md',
            },
          ],
        },
        {
          title: 'Icons',
          description: 'Supported icon sets and color options.',
          path: '/reference/icons',
          items: [
            {
              title: 'Overview',
              description: 'Supported icon sets and how to use them across your site.',
              path: '/reference/icons/overview',
              include: 'docs/references/icons/overview.mdx',
            },
            {
              title: 'Colors',
              description: 'Available icon color classes for workspace and feature cards.',
              path: '/reference/icons/colors',
              include: 'docs/references/icons/colors.mdx',
            },
          ],
        },
        {
          title: 'Tags',
          description: 'Technology tag definitions for workspace cards.',
          path: '/reference/technology',
          items: [
            {
              title: 'Overview',
              description: 'How technology tags map to icons on workspace cards.',
              path: '/reference/technology/overview',
              include: 'docs/references/technology/overview.mdx',
            },
            {
              title: 'Languages',
              description: 'Tags for programming languages.',
              path: '/reference/technology/languages',
              include: 'docs/references/technology/languages.mdx',
            },
            {
              title: 'Frameworks',
              description: 'Tags for frontend, backend, and mobile frameworks.',
              path: '/reference/technology/frameworks',
              include: 'docs/references/technology/frameworks.mdx',
            },
            {
              title: 'Databases',
              description: 'Tags for databases and data tools.',
              path: '/reference/technology/databases',
              include: 'docs/references/technology/databases.mdx',
            },
            {
              title: 'Infrastructure',
              description: 'Tags for cloud, hosting, CI/CD, and DevOps.',
              path: '/reference/technology/infrastructure',
              include: 'docs/references/technology/infrastructure.mdx',
            },
            {
              title: 'Tooling',
              description: 'Tags for build tools, styling, and testing.',
              path: '/reference/technology/tooling',
              include: 'docs/references/technology/tooling.mdx',
            },
            {
              title: 'Integrations',
              description: 'Tags for auth, AI/ML, CMS, and project-specific tools.',
              path: '/reference/technology/integrations',
              include: 'docs/references/technology/integrations.mdx',
            },
          ],
        },
      ],
    },
    {
      title: 'Packages',
      icon: 'pixelarticons:archive',
      path: '/packages',
      standalone: true,
      sort: (a, b) => {
        const order = ['@zpress/kit', '@zpress/cli', '@zpress/config', '@zpress/core']
        const aIdx = order.indexOf(a.title)
        const bIdx = order.indexOf(b.title)
        if (aIdx !== -1 && bIdx !== -1) {
          return aIdx - bIdx
        }
        if (aIdx !== -1) {
          return -1
        }
        if (bIdx !== -1) {
          return 1
        }
        return a.title.localeCompare(b.title)
      },
      items: [
        {
          title: '@zpress/kit',
          path: '/packages/zpress',
          items: [
            { title: 'Overview', path: '/packages/zpress', include: 'packages/zpress/README.md' },
            {
              title: 'Changelog',
              path: '/packages/zpress/changelog',
              include: 'packages/zpress/CHANGELOG.md',
            },
          ],
        },
        {
          title: '@zpress/cli',
          path: '/packages/cli',
          items: [
            { title: 'Overview', path: '/packages/cli', include: 'packages/cli/README.md' },
            {
              title: 'Changelog',
              path: '/packages/cli/changelog',
              include: 'packages/cli/CHANGELOG.md',
            },
          ],
        },
        {
          title: '@zpress/config',
          path: '/packages/config',
          items: [
            { title: 'Overview', path: '/packages/config', include: 'packages/config/README.md' },
            {
              title: 'Changelog',
              path: '/packages/config/changelog',
              include: 'packages/config/CHANGELOG.md',
            },
          ],
        },
        {
          title: '@zpress/ui',
          path: '/packages/ui',
          items: [
            { title: 'Overview', path: '/packages/ui', include: 'packages/ui/README.md' },
            {
              title: 'Changelog',
              path: '/packages/ui/changelog',
              include: 'packages/ui/CHANGELOG.md',
            },
          ],
        },
        {
          title: '@zpress/theme',
          path: '/packages/theme',
          items: [
            { title: 'Overview', path: '/packages/theme', include: 'packages/theme/README.md' },
            {
              title: 'Changelog',
              path: '/packages/theme/changelog',
              include: 'packages/theme/CHANGELOG.md',
            },
          ],
        },
        {
          title: '@zpress/templates',
          path: '/packages/templates',
          items: [
            {
              title: 'Overview',
              path: '/packages/templates',
              include: 'packages/templates/README.md',
            },
          ],
        },
      ],
    },
    {
      title: 'Contributing',
      icon: 'pixelarticons:git-merge',
      path: '/contributing',
      standalone: true,
      items: [
        {
          title: 'Overview',
          path: '/contributing',
          include: 'contributing/README.md',
        },
        {
          title: { from: 'heading' },
          path: '/contributing/concepts',
          include: 'contributing/concepts/*.md',
          sort: 'alpha',
        },
        {
          title: { from: 'heading' },
          path: '/contributing/concepts/engine',
          include: 'contributing/concepts/engine/*.md',
          sort: 'alpha',
        },
        {
          title: { from: 'heading' },
          path: '/contributing/references',
          include: 'contributing/references/*.md',
          sort: 'alpha',
        },
        {
          title: { from: 'heading' },
          path: '/contributing/guides',
          include: 'contributing/guides/*.md',
          sort: 'alpha',
        },
        {
          title: 'Standards',
          items: [
            {
              title: { from: 'heading' },
              path: '/contributing/standards/typescript',
              include: 'contributing/standards/typescript/*.md',
              sort: 'alpha',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/standards/git',
              include: 'contributing/standards/git-*.md',
              sort: 'alpha',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/standards/documentation',
              include: 'contributing/standards/documentation/*.md',
              sort: 'alpha',
            },
          ],
        },
      ],
    },
  ],
  nav: [
    { title: 'Getting Started', link: '/getting-started/introduction' },
    { title: 'Concepts', link: '/concepts/content' },
    { title: 'Guides', link: '/guides/deploying-to-vercel' },
    { title: 'Framework', link: '/framework/overview' },
    { title: 'Reference', link: '/reference/configuration' },
  ],
  socialLinks: [
    { icon: 'github', mode: 'link', content: 'https://github.com/joggrdocs/zpress' },
    { icon: 'npm', mode: 'link', content: 'https://www.npmjs.com/package/@zpress/kit' },
  ],
  footer: {
    message: 'Built with zpress',
    copyright: `Copyright © ${new Date().getFullYear()} Joggr`,
    socials: true,
  },
})
