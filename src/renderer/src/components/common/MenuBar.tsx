import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../store/player.store'
import { useOpenMedia } from '../../hooks/useOpenMedia'
import { SettingsModal } from '../settings/SettingsModal'
import { AboutModal } from './AboutModal'

type MenuItem = {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  onSelect: () => void
}

/**
 * Title bar menus: File, Settings, Help.
 *
 * Rendered inside the draggable title bar, so every interactive element opts
 * out of the drag region with `WebkitAppRegion: 'no-drag'` — otherwise clicks
 * would move the window instead of opening the menu.
 */
export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<'file' | 'help' | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const currentEpisode = usePlayerStore((s) => s.currentEpisode)
  const { openFile, openFolder, closeMedia } = useOpenMedia()

  // Close on outside click or Escape.
  useEffect(() => {
    if (!openMenu) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [openMenu])

  const fileItems: MenuItem[] = [
    { id: 'open-file', label: 'Open File...', onSelect: () => void openFile() },
    { id: 'open-folder', label: 'Open Folder...', onSelect: () => void openFolder() },
    {
      id: 'close-video',
      label: 'Close Video',
      disabled: !currentEpisode,
      onSelect: closeMedia
    },
    { id: 'exit', label: 'Exit', onSelect: () => void window.api.closeWindow() }
  ]

  const helpItems: MenuItem[] = [
    { id: 'about', label: `About AniLocal Player`, onSelect: () => setIsAboutOpen(true) }
  ]

  const renderDropdown = (items: MenuItem[]) => (
    <div
      role="menu"
      className="absolute left-0 top-full z-[80] mt-1 min-w-52 rounded-lg bg-dark-800 py-1 shadow-2xl"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {items.map((item, index) => (
        <div key={item.id}>
          {/* Separator before the window-level actions. */}
          {index === 2 && <div className="my-1 h-px bg-dark-700" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              setOpenMenu(null)
              item.onSelect()
            }}
            className="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-sm text-gray-300 transition-colors hover:bg-dark-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-300"
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-xs text-gray-500">{item.shortcut}</span>}
          </button>
        </div>
      ))}
    </div>
  )

  const triggerClass = (active: boolean) =>
    `h-7 rounded px-2.5 text-xs font-medium transition-colors ${
      active ? 'bg-dark-700 text-white' : 'text-gray-400 hover:bg-dark-800 hover:text-white'
    }`

  return (
    <>
      <div
        ref={barRef}
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* File */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'file'}
            onClick={() => setOpenMenu((m) => (m === 'file' ? null : 'file'))}
            className={triggerClass(openMenu === 'file')}
          >
            File
          </button>
          {openMenu === 'file' && renderDropdown(fileItems)}
        </div>

        {/* Settings — a direct action, not a menu */}
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null)
            setIsSettingsOpen(true)
          }}
          className={triggerClass(false)}
        >
          Settings
        </button>

        {/* Help */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'help'}
            onClick={() => setOpenMenu((m) => (m === 'help' ? null : 'help'))}
            className={triggerClass(openMenu === 'help')}
          >
            Help
          </button>
          {openMenu === 'help' && renderDropdown(helpItems)}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  )
}
