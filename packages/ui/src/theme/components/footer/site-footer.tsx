import { SocialLinks } from '@rspress/core/theme-original'
import type React from 'react'
import { match } from 'ts-pattern'

import { useZpress } from '../../hooks/use-zpress'

import './site-footer.css'

interface FooterColumn {
  readonly heading: string
  readonly links: readonly { readonly text: string; readonly href: string }[]
}

const DEFAULT_COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { text: 'Features', href: '/' },
      { text: 'Changelog', href: '/' },
      { text: 'Roadmap', href: '/' },
    ],
  },
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
  {
    heading: 'Company',
    links: [{ text: 'About', href: '/' }],
  },
]

/**
 * Site-wide footer rendered at the bottom of every page.
 *
 * 4-column sitemap layout matching the approved mockup. Brand block on the
 * left, three link columns on the right, and a full-width bottom strip with
 * copyright + tagline divided by a hairline.
 *
 * @returns Footer element, or null when no footer config is provided.
 */
export function SiteFooter(): React.ReactElement | null {
  const { zpressFooter } = useZpress()

  return match(zpressFooter)
    .with(undefined, () => null)
    .when(
      (f) => f.message === undefined && f.copyright === undefined && f.socials !== true,
      () => null
    )
    .otherwise((f) => (
      <footer className="zp-site-footer">
        <div className="zp-site-footer__inner">
          <div className="zp-site-footer__grid">
            <div className="zp-site-footer__brand">
              <div className="zp-site-footer__brand-mark">Z</div>
              {match(f.message)
                .with(undefined, () => null)
                .otherwise((msg) => (
                  <p className="zp-site-footer__message">{msg}</p>
                ))}
              {match(f.socials)
                .with(true, () => (
                  <div className="zp-site-footer__socials">
                    <SocialLinks />
                  </div>
                ))
                .otherwise(() => null)}
            </div>
            {DEFAULT_COLUMNS.map((col) => (
              <div key={col.heading} className="zp-site-footer__col">
                <h4 className="zp-site-footer__col-title">{col.heading}</h4>
                <ul className="zp-site-footer__col-list">
                  {col.links.map((link) => (
                    <li key={link.text}>
                      <a href={link.href}>{link.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="zp-site-footer__bottom">
          <div className="zp-site-footer__bottom-inner">
            {match(f.copyright)
              .with(undefined, () => <span>© zpress · MIT License</span>)
              .otherwise((cr) => (
                <span className="zp-site-footer__copyright">{cr}</span>
              ))}
            <span className="zp-site-footer__tagline">built on Rspress · powered by Joggr</span>
          </div>
        </div>
      </footer>
    ))
}
