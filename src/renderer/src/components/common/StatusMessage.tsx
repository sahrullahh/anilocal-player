import type { ReactNode } from 'react'
import { AlertIcon, CheckCircleIcon, InfoIcon } from './icons'

export type StatusTone = 'success' | 'error' | 'info'

type StatusMessageProps = {
  tone: StatusTone
  children: ReactNode
  className?: string
}

/**
 * Inline operation feedback.
 *
 * The reason this exists as a primitive: LibrarySettings rendered
 * `applyStatus` as `text-green-400` unconditionally, so failures like
 * "No episode selected." and "No matching entry in active pack." showed
 * up in success green. Here the caller must state the tone, so the
 * colour follows the actual outcome.
 */
const TONES: Record<StatusTone, { text: string; icon: ReactNode }> = {
  success: { text: 'text-status-success', icon: <CheckCircleIcon size="xs" /> },
  error: { text: 'text-status-danger', icon: <AlertIcon size="xs" /> },
  info: { text: 'text-content-muted', icon: <InfoIcon size="xs" /> }
}

export function StatusMessage({ tone, children, className = '' }: StatusMessageProps) {
  const { text, icon } = TONES[tone]

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-1.5 text-caption ${text} ${className}`}
    >
      <span className="mt-px shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}
