import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/player.store'
import { useSettingsStore } from '../store/settings.store'

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoSrc, setVideoSrc] = useState<string>('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlayingLocal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { currentEpisode, updateProgress, setIsPlaying } = usePlayerStore()
  const { volume, isMute, setVolume, setIsMute, repeat } = useSettingsStore()

  useEffect(() => {
    if (!currentEpisode) {
      setVideoSrc('')
      return
    }

    window.api
      .toFileUrl(currentEpisode.filePath)
      .then((url) => {
        setVideoSrc(url)
      })
      .catch((error) => {
        console.error('Failed to create video file URL', error)
        setVideoSrc('')
      })
  }, [currentEpisode])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play().catch((error) => {
        console.error('Failed to play video', error)
      })
    } else {
      video.pause()
    }
  }, [])

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
  }, [])

  const setSeek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
  }, [])

  const toggleMute = useCallback(() => {
    setIsMute(!isMute)
  }, [isMute, setIsMute])

  const toggleFullscreen = useCallback(() => {
    // Use the video's grandparent (outer player div) for fullscreen so the
    // entire player — including controls — enters fullscreen, not just the
    // inner video wrapper div.
    const container = videoRef.current?.parentElement?.parentElement
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = isMute
  }, [volume, isMute, videoSrc])

  // Sync repeat/loop state to the video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.loop = repeat
  }, [repeat, videoSrc])

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    setDuration(video.duration || 0)
  }, [])

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video || !currentEpisode) return

    setDuration(video.duration || 0)
    const progress = usePlayerStore.getState().progressData[currentEpisode.filePath]
    if (
      progress &&
      progress.currentTime > 10 &&
      progress.currentTime < (video.duration || 0) - 15
    ) {
      video.currentTime = progress.currentTime
    }
    video.play().catch((error) => {
      console.error('Autoplay failed after metadata loaded', error)
    })
  }, [currentEpisode])

  const onPlay = useCallback(() => {
    setIsPlayingLocal(true)
    setIsPlaying(true)
  }, [setIsPlaying])

  const onPause = useCallback(() => {
    setIsPlayingLocal(false)
    setIsPlaying(false)
  }, [setIsPlaying])

  const onError = useCallback(() => {
    const video = videoRef.current
    console.error('Video element error', {
      src: video?.currentSrc,
      error: video?.error,
      networkState: video?.networkState,
      readyState: video?.readyState
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current
      if (video && currentEpisode && video.duration) {
        updateProgress(video.currentTime, video.duration)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [currentEpisode, updateProgress])

  return {
    videoRef,
    videoSrc,
    currentTime,
    duration,
    isPlaying,
    isFullscreen,
    volume,
    isMute,
    repeat,
    setVolume,
    setSeek,
    seek,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    onTimeUpdate,
    onLoadedMetadata,
    onPlay,
    onPause,
    onError
  }
}
