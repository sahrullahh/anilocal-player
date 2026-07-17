import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/player.store'
import { useSettingsStore } from '../store/settings.store'

export function useAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [episodeEnded, setEpisodeEnded] = useState(false)
  const { currentEpisode, playlist, playNext, setAutoplayDelay } = usePlayerStore()
  const { autoplay, repeat } = useSettingsStore()

  const autoplayRef = useRef(autoplay)
  const repeatRef = useRef(repeat)
  useEffect(() => { autoplayRef.current = autoplay }, [autoplay])
  useEffect(() => { repeatRef.current = repeat }, [repeat])

  const isLastEpisode = useCallback(() => {
    if (!currentEpisode || playlist.length === 0) return false
    const idx = playlist.findIndex((ep) => ep.id === currentEpisode.id)
    return idx === playlist.length - 1
  }, [currentEpisode, playlist])

  const startCountdown = useCallback(() => {
    if (!autoplayRef.current || repeatRef.current) return

    if (isLastEpisode()) {
      setEpisodeEnded(true)
      setAutoplayDelay(true)
      return
    }

    setCountdown(5)
    setAutoplayDelay(true)
  }, [setAutoplayDelay, isLastEpisode])

  const cancelAutoplay = useCallback(() => {
    setCountdown(null)
    setAutoplayDelay(false)
  }, [setAutoplayDelay])

  const dismissEnded = useCallback(() => {
    setEpisodeEnded(false)
    setAutoplayDelay(false)
  }, [setAutoplayDelay])

  // Reset ended state when episode changes
  useEffect(() => {
    setEpisodeEnded(false)
  }, [currentEpisode])

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
  }, [videoRef, startCountdown, currentEpisode])

  return { countdown, episodeEnded, cancelAutoplay, dismissEnded }
}
