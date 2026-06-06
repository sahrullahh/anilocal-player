import { useCallback, useEffect, useRef, useState } from 'react'

const IDLE_TIMEOUT_MS = 3000

/**
 * Returns whether the controls should be visible.
 * In fullscreen mode the controls hide after IDLE_TIMEOUT_MS of no mouse movement.
 * Outside fullscreen the controls are always visible (handled by CSS hover).
 */
export function useIdleMouseHide(isFullscreen: boolean) {
  const [controlsVisible, setControlsVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    setControlsVisible(true)

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, IDLE_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    if (!isFullscreen) {
      // Outside fullscreen: always show, clear any pending timer
      setControlsVisible(true)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Enter fullscreen: start the idle timer immediately
    resetTimer()

    document.addEventListener('mousemove', resetTimer)
    document.addEventListener('mousedown', resetTimer)
    document.addEventListener('keydown', resetTimer)

    return () => {
      document.removeEventListener('mousemove', resetTimer)
      document.removeEventListener('mousedown', resetTimer)
      document.removeEventListener('keydown', resetTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isFullscreen, resetTimer])

  return { controlsVisible }
}
