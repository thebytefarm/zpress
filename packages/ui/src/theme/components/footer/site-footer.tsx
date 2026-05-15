import { SocialLinks } from '@rspress/core/theme-original'
import type React from 'react'
import { match } from 'ts-pattern'

import { useZpress } from '../../hooks/use-zpress'

import './site-footer.css'

/**
 * Site-wide footer rendered at the bottom of every page.
 *
 * Brand block on the left, optional link columns on the right (from
 * `site.footer.columns`), and a full-width bottom strip with copyright +
 * tagline divided by a hairline.
 *
 * Renders `null` when neither the top-level `footer` config (Rspress-compat
 * `message` / `copyright` / `socials`) nor `site.footer` is provided, so a
 * consumer who configures neither gets no footer rather than an empty shell.
 *
 * @returns Footer element, or null when no footer config is provided.
 */
export function SiteFooter(): React.ReactElement | null {
  const { zpressFooter, site } = useZpress()
  const { footer: siteFooter } = site ?? {}
  const { message, copyright, socials } = zpressFooter ?? {}
  const { columns, tagline, brandMark } = siteFooter ?? {}

  const hasRspressContent = message !== undefined || copyright !== undefined || socials === true
  const hasSiteContent = columns !== undefined || tagline !== undefined

  if (!hasRspressContent && !hasSiteContent) {
    return null
  }

  const resolvedColumns = columns ?? []
  const resolvedBrandMark = brandMark ?? 'Z'

  return (
    <footer className="zp-site-footer">
      <div className="zp-site-footer__inner">
        <div className="zp-site-footer__grid">
          <div className="zp-site-footer__brand">
            <div className="zp-site-footer__brand-mark">{resolvedBrandMark}</div>
            {match(message)
              .with(undefined, () => null)
              .otherwise((msg) => (
                <p className="zp-site-footer__message">{msg}</p>
              ))}
            {match(socials === true)
              .with(true, () => (
                <div className="zp-site-footer__socials">
                  <SocialLinks />
                </div>
              ))
              .otherwise(() => null)}
          </div>
          {resolvedColumns.map((col) => (
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
          {match(copyright)
            .with(undefined, () => null)
            .otherwise((cr) => (
              <span className="zp-site-footer__copyright">{cr}</span>
            ))}
          {match(tagline)
            .with(undefined, () => null)
            .otherwise((tag) => (
              <span className="zp-site-footer__tagline">{tag}</span>
            ))}
        </div>
      </div>
    </footer>
  )
}
