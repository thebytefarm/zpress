import { match, P } from 'massaman/match'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Button, Disclosure, DisclosurePanel } from 'react-aria-components'

import { Icon } from './icon'

// ---------------------------------------------------------------------------
// AccordionGroup
// ---------------------------------------------------------------------------

export interface AccordionGroupProps {
  /**
   * When true, only one accordion in the group can be open at a time.
   */
  readonly exclusive?: boolean
  /**
   * Accordion children to coordinate.
   */
  readonly children: React.ReactNode
}

interface AccordionGroupContextValue {
  readonly exclusive: boolean
  readonly openId: string | null
  readonly setOpenId: (id: string | null) => void
}

const AccordionGroupContext = createContext<AccordionGroupContextValue | null>(null)

/**
 * Group container that coordinates multiple Accordion components.
 * When `exclusive` is true, only one accordion can be open at a time.
 *
 * @param props - Group configuration with optional exclusive mode
 * @returns React element wrapping coordinated accordions
 */
export function AccordionGroup({
  exclusive = false,
  children,
}: AccordionGroupProps): React.ReactElement {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <AccordionGroupContext.Provider value={{ exclusive, openId, setOpenId }}>
      <div className="zp-accordion-group">{children}</div>
    </AccordionGroupContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Accordion
// ---------------------------------------------------------------------------

export interface AccordionProps {
  /**
   * Title displayed in the accordion trigger.
   */
  readonly title: string
  /**
   * Optional description displayed below the title.
   */
  readonly description?: string
  /**
   * Optional Iconify icon ID rendered before the title.
   */
  readonly icon?: string
  /**
   * Whether the accordion starts in the expanded state.
   */
  readonly defaultOpen?: boolean
  /**
   * Custom anchor ID for deep linking. Defaults to a slug of the title.
   */
  readonly id?: string
  /**
   * Content revealed when the accordion is expanded.
   */
  readonly children: React.ReactNode
}

/**
 * Expandable section with title, optional description and icon,
 * URL-hash deep linking, and keyboard-accessible expand/collapse.
 *
 * Built on react-aria-components Disclosure for full ARIA support.
 *
 * @param props - Accordion configuration
 * @returns React element with expandable disclosure
 */
export function Accordion({
  title,
  description,
  icon,
  defaultOpen = false,
  id,
  children,
}: AccordionProps): React.ReactElement {
  const anchorId = id ?? slugify(title)
  const group = useContext(AccordionGroupContext)
  const isFirstRender = useRef(true)

  // Determine if this accordion should start open:
  // 1. URL hash match takes priority
  // 2. Then defaultOpen prop
  // 3. Then group exclusive state
  const hashMatch = globalThis.location !== undefined && globalThis.location.hash === `#${anchorId}`
  const initialOpen = hashMatch || defaultOpen

  const [isExpanded, setIsExpanded] = useState(initialOpen)

  // Seed exclusive group state from defaultOpen on initial render
  useEffect(() => {
    if (group !== null && group.exclusive && group.openId === null && initialOpen) {
      group.setOpenId(anchorId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- seed once on mount

  // Sync with group exclusive mode
  const expanded = match(group)
    .with(
      P.when((g): g is AccordionGroupContextValue => g !== null && g.exclusive),
      (g) => g.openId === anchorId
    )
    .otherwise(() => isExpanded)

  const handleExpandedChange = useCallback(
    (open: boolean) => {
      match({ group, exclusive: group !== null && group.exclusive })
        .with({ group: P.nonNullable, exclusive: true }, ({ group: g }) => {
          g.setOpenId(
            match(open)
              .with(true, () => anchorId)
              .otherwise(() => null)
          )
        })
        .otherwise(() => {
          setIsExpanded(open)
        })

      // Update URL hash on expand
      if (open && globalThis.history !== undefined) {
        globalThis.history.replaceState(null, '', `#${anchorId}`)
      }
    },
    [group, anchorId]
  )

  // Auto-expand on mount if URL hash matches
  useEffect(() => {
    if (isFirstRender.current && hashMatch) {
      isFirstRender.current = false
      handleExpandedChange(true)
    }
  }, [hashMatch, handleExpandedChange])

  const iconEl = match(icon)
    .with(P.nonNullable, (i) => (
      <span className="zp-accordion__icon">
        <Icon icon={i} />
      </span>
    ))
    .otherwise(() => null)

  const descEl = match(description)
    .with(P.nonNullable, (d) => <span className="zp-accordion__description">{d}</span>)
    .otherwise(() => null)

  return (
    <Disclosure
      id={anchorId}
      isExpanded={expanded}
      onExpandedChange={handleExpandedChange}
      className="zp-accordion"
    >
      <Button slot="trigger" className="zp-accordion__trigger">
        {iconEl}
        <span className="zp-accordion__header">
          <span className="zp-accordion__title">{title}</span>
          {descEl}
        </span>
        <span className="zp-accordion__chevron">
          <Icon icon="pixelarticons:chevron-right" />
        </span>
      </Button>
      <DisclosurePanel className="zp-accordion__panel">{children}</DisclosurePanel>
    </Disclosure>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Convert a title string to a URL-safe slug.
 *
 * @private
 * @param text - Title text to slugify
 * @returns Lowercase hyphenated slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
}
