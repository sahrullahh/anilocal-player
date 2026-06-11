import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/player.store'
import { useSettingsStore } from '../store/settings.store'

export function useAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const { currentEpisode, playNext, setAutoplayDelay } = usePlayerStore()
  const { autoplay, repeat } = useSettingsStore()

  // Keep a ref to always read the latest autoplay/repeat value inside the event listener
  const autoplayRef = useRef(autoplay)
  const repeatRef = useRef(repeat)
  useEffect(() => { autoplayRef.current = autoplay }, [autoplay])
  useEffect(() => { repeatRef.current = repeat }, [repeat])

  const startCountdown = useCallback(() => {
    // Don't autoplay next episode when repeat is on — video.loop handles looping natively
    if (!autoplayRef.current || repeatRef.current) return
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
