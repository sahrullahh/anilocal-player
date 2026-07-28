import React from 'react'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'fansub'
  | 'success'
  | 'warning'
  | 'danger'
  | 'video'

type BadgeProps = {
  tone?: BadgeTone
  /** Rendered on an active/selected row, which has its own background. */
  onActiveSurface?: boolean
  className?: string
  title?: string
  children: React.ReactNode
}

/**
 * Non-interactive marker: INTRO, OUTRO, fansub group, subtitle format,
 * EMBEDDED.
 *
 * Text size moves from 10px to 12px (the `caption` token). Badges carry
 * real information, so they should not render at a size that is hard to
 * read; padding is tightened to compensate for the extra width.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-active text-content-tertiary',
  accent: 'bg-accent text-content-on-accent',
  fansub: 'bg-status-info/20 text-status-info',
  success: 'bg-status-success-surface text-status-success',
  warning: 'bg-status-warning-surface text-status-warning',
  danger: 'bg-status-danger-surface text-status-danger',
  video: 'bg-video-control-active text-video-content'
}

export function Badge({
  tone = 'neutral',
  onActiveSurface = false,
  className = '',
  title,
  children
}: BadgeProps) {
  return (
    <span
      title={title}
      className={[
        'inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5',
        'text-caption font-semibold uppercase leading-none tracking-wide',
        onActiveSurface ? 'bg-content-on-accent/20 text-content-on-accent' : TONES[tone],
        className
      ].join(' ')}
    >
      {children}
    </span>
  )
}
