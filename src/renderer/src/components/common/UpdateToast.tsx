import { useEffect, useRef } from 'react'
import { useUpdateStore } from '../../store/update.store'

/**
 * Lightweight VS Code-style toast notification for update events.
 * Appears in the bottom-right corner, auto-dismisses after a few seconds.
 * Does NOT interrupt playback.
 */
export function UpdateToast() {
  const status = useUpdateStore((s) => s.status)
  const info = useUpdateStore((s) => s.info)
  const prevStatusRef = useRef<string>('')

  // Only show toast on status *transitions* that the user should know about
  const toastConfig: Partial<Record<string, { icon: string; text: string; color: string }>> = {
    available: {
      icon: '↑',
      text: info ? `Update available: v${info.version}` : 'Update available',
      color: 'bg-blue-700'
    },
    downloaded: {
      icon: '✔',
      text: 'Download complete — restart to install',
      color: 'bg-green-700'
    },
    'not-available': {
      icon: '✔',
      text: 'Already up to date',
      color: 'bg-dark-800'
    }
  }

  const toast = toastConfig[status]
  const isNew = prevStatusRef.current !== status

  useEffect(() => {
    prevStatusRef.current = status
  }, [status])

  if (!toast || !isNew) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-medium pointer-events-none select-none animate-slideUp ${toast.color}`}
    >
      <span className="text-base">{toast.icon}</span>
      <span>{toast.text}</span>
    </div>
  )
}
