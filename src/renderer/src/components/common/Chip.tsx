import React from 'react'

type ChipProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {
  selected: boolean
  children: React.ReactNode
}

/**
 * Interactive single-choice option: subtitle language, subtitle format,
 * update channel, theme.
 *
 * Minimum height is 32px (was roughly 28px), and the selected state uses
 * the accent token everywhere. Previously the subtitle format chips used
 * `bg-purple-700` while every other selectable thing in the app used
 * blue, which implied a distinction that does not exist.
 */
export function Chip({
  selected,
  className = '',
  children,
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={[
        'inline-flex h-8 items-center justify-center rounded-md px-3',
        'text-label transition-colors duration-fast ease-standard focus-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        selected
          ? 'bg-accent text-content-on-accent'
          : 'bg-surface-raised text-content-secondary hover:bg-surface-hover hover:text-content-primary',
        className
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
