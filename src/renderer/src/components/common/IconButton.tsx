import React from 'react'

/**
 * Icon-only button.
 *
 * Solves two problems that were spread across ~15 call sites: hit areas
 * below 32px (close buttons were `p-1` around a 16px icon, roughly 24px
 * total) and missing focus states (only `Button` had one, so every raw
 * icon button was invisible to keyboard users).
 *
 * `label` is required by the type, so an icon button without an
 * accessible name is a compile error rather than something to remember.
 */
type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Accessible name, also used as the tooltip unless `title` is given. */
  label: string
  icon: React.ReactNode
  /** `sm` = 32px, `md` = 40px. Both exceed the 32px minimum target. */
  size?: 'sm' | 'md'
  tone?: 'default' | 'accent' | 'danger' | 'video'
  /** When provided, renders as a toggle and exposes `aria-pressed`. */
  active?: boolean
}

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10'
} as const

const TONES = {
  default: 'text-content-tertiary hover:text-content-primary hover:bg-surface-hover',
  accent: 'text-accent-content hover:bg-surface-hover',
  danger: 'text-content-tertiary hover:text-status-danger hover:bg-status-danger-surface',
  video: 'text-video-content hover:bg-video-control-hover'
} as const

const ACTIVE_TONES = {
  default: 'text-accent-content bg-surface-active',
  accent: 'text-accent-content bg-surface-active',
  danger: 'text-status-danger bg-status-danger-surface',
  // On video, active state gets both colour AND a background, so it is
  // distinguishable without relying on colour perception.
  video: 'text-video-content bg-video-control-active'
} as const

export function IconButton({
  label,
  icon,
  size = 'sm',
  tone = 'default',
  active,
  className = '',
  title,
  type = 'button',
  ...props
}: IconButtonProps) {
  const toneClass = active ? ACTIVE_TONES[tone] : TONES[tone]
  const focusClass = tone === 'video' ? 'focus-ring-video' : 'focus-ring'

  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={active}
      title={title ?? label}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-md',
        'transition-colors duration-fast ease-standard',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        SIZES[size],
        toneClass,
        focusClass,
        className
      ].join(' ')}
      {...props}
    >
      {icon}
    </button>
  )
}
