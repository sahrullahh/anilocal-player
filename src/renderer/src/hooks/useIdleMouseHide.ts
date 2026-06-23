import { useCallback, useEffect, useRef, useState } from 'react'

const IDLE_TIMEOUT_MS = 3000

/**
 * Returns whether the controls should be visible.
 * When playing, controls hide after IDLE_TIMEOUT_MS of no mouse movement.
 * When paused, controls are always visible.
 */
export function useIdleMouseHide(isFullscreen: boolean, isPlaying = false) {
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
    // If not playing, always show controls and clear timer/listeners
    if (!isPlaying) {
      setControlsVisible(true)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // When playing: start/reset the idle timer and listen for activity
    resetTimer()

    document.addEventListener('mousemove', resetTimer)
    document.addEventListener('mousedown', resetTimer)
    document.addEventListener('keydown', resetTimer)

    return () => {
      document.removeEventListener('mousemove', resetTimer)
      document.removeEventListener('mousedown', resetTimer)
      document.removeEventListener('keydown', resetTimer)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isFullscreen, isPlaying, resetTimer])

  return { controlsVisible }
}
