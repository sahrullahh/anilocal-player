import React, { useEffect, useId, useRef } from 'react'
import { IconButton } from './IconButton'
import { CloseIcon } from './icons'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Adds what the previous implementation was missing: Escape to close,
 * focus trapping, focus restoration to the element that opened it, and
 * dialog semantics. The close button was a bare 24px icon with no
 * padding and no focus style; it is now an IconButton.
 *
 * The header no longer scrolls away with the body content.
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  // Remember the trigger so focus can go back to it on close.
  useEffect(() => {
    if (isOpen) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null
    } else {
      restoreFocusRef.current?.focus?.()
      restoreFocusRef.current = null
    }
  }, [isOpen])

  // Move focus into the dialog once it opens.
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return
    const first = panel.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel).focus()
  }, [isOpen])

  // Escape to close, Tab cycles within the dialog.
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-video-scrim-bottom backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-surface-overlay shadow-overlay animate-slideUp mx-4 focus:outline-none"
      >
        {/* Header stays put while the body scrolls. */}
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
          <h2 id={titleId} className="text-title text-content-primary">
            {title}
          </h2>
          <IconButton label="Close" icon={<CloseIcon size="md" />} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}
