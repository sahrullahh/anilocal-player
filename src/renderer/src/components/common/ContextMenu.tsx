import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type ContextMenuItem = {
  id: string
  label: string
  tone?: 'default' | 'danger'
  onSelect: () => void
}

type ContextMenuProps = {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

const MARGIN = 8

/**
 * In-app right-click menu.
 *
 * Only ever calls handlers that already exist, so it adds no new data
 * operations of its own. Closes on Escape, outside click, or selection, and
 * clamps itself inside the viewport so a right-click near a window edge still
 * shows the whole menu.
 *
 * Separate from the Windows shell "Open with" integration in the main process,
 * which is untouched.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  // Clamp once the real size is known.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPosition({
      left: Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN)),
      top: Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN))
    })
  }, [x, y])

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

      const el = menuRef.current
      if (!el) return
      event.preventDefault()
      event.stopPropagation()
      const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next =
        event.key === 'ArrowDown'
          ? (index + 1) % buttons.length
          : (index - 1 + buttons.length) % buttons.length
      buttons[next]?.focus()
    }

    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ left: position.left, top: position.top }}
      className="fixed z-[80] min-w-48 overflow-hidden rounded-lg bg-dark-800 py-1 shadow-2xl"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onSelect()
            onClose()
          }}
          className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
            item.tone === 'danger'
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-gray-300 hover:bg-dark-700 hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
