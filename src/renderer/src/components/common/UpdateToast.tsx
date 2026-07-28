import { useEffect, useRef } from 'react'
import { useUpdateStore } from '../../store/update.store'

/**
 * Lightweight VS Code-style toast notification for update events.
 * Appears in the bottom-right corner, auto-dismisses after a few seconds.
 * Does NOT interrupt playback.
 */
export function UpdateToast() {
  const status = useUpdateStore((s) => s.status)
  const silent = useUpdateStore((s) => s.silent)
  const prevStatusRef = useRef<string>('')

  // Only show toast on status *transitions* that the user should know about.
  // The 'available' state is handled by UpdateModal (an interactive popup), so
  // it is intentionally omitted here to avoid a duplicate notification.
  const toastConfig: Partial<Record<string, { icon: string; text: string; color: string }>> = {
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

  // Suppress the "Already up to date" toast for the silent startup check —
  // only surface it when the user manually checked from Settings.
  const toast = status === 'not-available' && silent ? undefined : toastConfig[status]
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
