type SkeletonProps = {
  /** Size classes. Always pass explicit dimensions matching the final content. */
  className?: string
  rounded?: 'sm' | 'md' | 'full'
}

/**
 * Placeholder that reserves space the same size as the content that
 * replaces it, so nothing shifts when async work finishes. Used for
 * episode thumbnails (80×48) and for the duration metrics that were
 * previously rendered as the literal strings 'Calculating duration...'
 * and '...'.
 *
 * The pulse honours prefers-reduced-motion via main.css.
 */
const ROUNDED = { sm: 'rounded-sm', md: 'rounded-md', full: 'rounded-full' } as const

export function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-surface-active ${ROUNDED[rounded]} ${className}`}
    />
  )
}
