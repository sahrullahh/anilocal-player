import { useCallback, useEffect, useState } from 'react'
import { usePlayerStore } from '../store/player.store'
import { useSettingsStore } from '../store/settings.store'

export function useAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const { playNext, setAutoplayDelay } = usePlayerStore()
  const { autoplay } = useSettingsStore()

  const startCountdown = useCallback(() => {
    if (!autoplay) return
    setCountdown(5)
    setAutoplayDelay(true)
  }, [autoplay, setAutoplayDelay])

  const cancelAutoplay = useCallback(() => {
    setCountdown(null)
    setAutoplayDelay(false)
  }, [setAutoplayDelay])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      setAutoplayDelay(false)
      playNext()
      return
    }

    const timeout = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timeout)
  }, [countdown, playNext, setAutoplayDelay])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onEnded = () => startCountdown()
    video.addEventListener('ended', onEnded)
    return () => video.removeEventListener('ended', onEnded)
  }, [videoRef, startCountdown])

  return { countdown, cancelAutoplay }
}
