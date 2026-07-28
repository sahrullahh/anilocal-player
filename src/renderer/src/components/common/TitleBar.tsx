import { useEffect, useRef } from 'react'
import appLogo from '../../assets/app_logo.png'
import { MenuBar } from './MenuBar'

/** Must match TITLE_BAR_HEIGHT in src/main/window.ts. */
export const TITLE_BAR_HEIGHT = 36

/** `rgb(17, 24, 39)` → `#111827`. Electron's overlay wants a plain colour string. */
function toHex(cssColor: string): string | null {
  const match = cssColor.match(/^rgba?\(([^)]+)\)$/)
  if (!match) return /^#[0-9a-f]{3,8}$/i.test(cssColor) ? cssColor : null

  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null

  const [r, g, b] = parts
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/**
 * App title bar.
 *
 * The window runs with `titleBarStyle: 'hidden'` plus a native overlay, so
 * Windows still draws the real minimize / maximize / close buttons — keeping
 * their behaviour, snap layouts and hover previews — while their background
 * and glyph colour are ours to set.
 *
 * Colours are read off the rendered DOM rather than from the CSS custom
 * properties directly: `getPropertyValue('--surface-default')` returns the
 * literal text `var(--c-900)`, which Electron cannot parse. Reading
 * `getComputedStyle(node).backgroundColor` gives a resolved `rgb(...)`
 * instead. Because the values come from the rendered elements, a new Theme
 * Pack needs no change here.
 */
export function TitleBar() {
  const barRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const sync = () => {
      const bar = barRef.current
      const label = labelRef.current
      if (!bar || !label) return

      const color = toHex(getComputedStyle(bar).backgroundColor)
      const symbolColor = toHex(getComputedStyle(label).color)
      if (!color || !symbolColor) return

      const theme = document.documentElement.getAttribute('data-theme')

      void window.api
        .setTitleBarColors({ color, symbolColor, dark: theme !== 'light' })
        .catch(() => undefined)
    }

    // Two frames of delay on first run so the stylesheet has definitely
    // applied before the colours are read.
    const raf = requestAnimationFrame(() => requestAnimationFrame(sync))

    // Re-sync whenever the theme attribute on <html> changes.
    const observer = new MutationObserver(() => requestAnimationFrame(sync))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={barRef}
      // A hairline separates the bar from the panels below it, which otherwise
      // share the same surface and made the strip read as part of the layout.
      className="flex shrink-0 select-none items-center gap-2 border-b border-line-subtle bg-surface pl-3"
      style={
        {
          height: TITLE_BAR_HEIGHT,
          // Leaves room for the native window buttons on the right.
          paddingRight: 140,
          WebkitAppRegion: 'drag'
        } as React.CSSProperties
      }
    >
      <img
        src={appLogo}
        alt=""
        draggable={false}
        className="h-4 w-4 shrink-0 select-none object-contain"
      />
      <span
        ref={labelRef}
        className="hidden shrink-0 truncate text-caption font-medium tracking-wide text-content-tertiary sm:block"
      >
        AniLocal Player
      </span>

      <MenuBar />
    </div>
  )
}
