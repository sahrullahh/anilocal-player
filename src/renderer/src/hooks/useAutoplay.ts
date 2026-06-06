import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/player.store'
import { useSettingsStore } from '../store/settings.store'

export function useAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const { currentEpisode, playNext, setAutoplayDelay } = usePlayerStore()
  const { autoplay } = useSettingsStore()

  // Keep a ref to always read the latest autoplay value inside the event listener
  // without needing to re-attach the listener every time autoplay changes
  const autoplayRef = useRef(autoplay)
  useEffect(() => {
    autoplayRef.current = autoplay
  }, [autoplay])

  const startCountdown = useCallback(() => {
    if (!autoplayRef.current) return
    setCountdown(5)
    setAutoplayDelay(true)
  }, [setAutoplayDelay])

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
  // Re-attach when episode changes so the listener is always fresh
  }, [videoRef, startCountdown, currentEpisode])

  return { countdown, cancelAutoplay }
}
