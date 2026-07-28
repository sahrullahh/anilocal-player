import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Changes from the previous implementation:
 * - `ghost` no longer hardcodes `text-gray-300`, `danger` no longer
 *   hardcodes `red-600`/`red-700`; both use semantic tokens.
 * - `focus:ring` became `focus-visible:ring`, so the ring no longer
 *   appears after every mouse click.
 * - New `subtle` variant replaces the repeated
 *   `variant="ghost" className="border border-dark-600"` pattern
 *   (used seven times in LibrarySettings alone).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyles = [
    'inline-flex items-center justify-center gap-2 font-medium rounded-md',
    'transition-colors duration-fast ease-standard focus-ring',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ].join(' ')

  const variants = {
    primary: 'bg-accent hover:bg-accent-hover active:bg-accent-active text-content-on-accent',
    secondary: 'bg-surface-active hover:bg-surface-hover text-content-primary',
    subtle:
      'bg-surface-raised hover:bg-surface-hover text-content-secondary hover:text-content-primary',
    ghost: 'bg-transparent hover:bg-surface-hover text-content-secondary',
    danger: 'bg-status-danger text-content-on-accent hover:opacity-90'
  }

  // Minimum 32px height at every size, per the accessibility target.
  const sizes = {
    sm: 'h-8 px-3 text-label',
    md: 'h-10 px-4 text-body',
    lg: 'h-12 px-6 text-subtitle'
  }

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
