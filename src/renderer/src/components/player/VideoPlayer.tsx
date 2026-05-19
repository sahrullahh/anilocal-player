import { useVideoPlayer } from '../../hooks/useVideoPlayer'
import { useSubtitle } from '../../hooks/useSubtitle'
import { useAutoplay } from '../../hooks/useAutoplay'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { usePlayerStore } from '../../store/player.store'
import { PlayerControls } from './PlayerControls'
import { SkipOverlay } from './SkipOverlay'
import { AutoplayCountdown } from './AutoplayCountdown'
import { EmptyState } from '../common/EmptyState'
import type { SkipTimestamps } from '../../types/anime'
import type { DiscordActivityPayload } from '../../types/electron-api'
import { useEffect, useRef } from 'react'
import { formatTime } from '../../utils/time'

export function VideoPlayer() {
  const { currentEpisode, skipData, updateSkipData } = usePlayerStore()
  const {
    videoRef,
    videoSrc,
    currentTime,
    duration,
    isPlaying,
    volume,
    isMute,
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
  } = useVideoPlayer()

  const { selectedSubtitle, subtitleSrc, setSelectedSubtitle } = useSubtitle(
    currentEpisode?.subtitles || []
  )

  const { countdown, cancelAutoplay } = useAutoplay(videoRef)
  const lastPresenceUpdateRef = useRef(0)

  useKeyboardShortcuts({
    togglePlay,
    seek,
    toggleFullscreen,
    toggleMute,
    nextEpisode: () => usePlayerStore.getState().playNext(),
    skip: () => {
      const current = skipData?.[currentEpisode?.filePath || '']
      if (current?.introEnd && currentTime < current.introEnd) {
        setSeek(current.introEnd)
      } else if (current?.outroEnd && currentTime < current.outroEnd) {
        setSeek(current.outroEnd)
      }
    }
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleClick = () => togglePlay()
    video.addEventListener('click', handleClick)

    return () => video.removeEventListener('click', handleClick)
  }, [videoRef, togglePlay])

  const parseEpisodeNumber = (title: string): number => {
    const match = title.match(/(?:ep(?:isode)?\s*)(\d+)/i) || title.match(/(\d+)/)
    return match ? Number(match[1]) : 1
  }

  const syncDiscordPresence = async (
    playing: boolean,
    force = false,
    timeOverride?: number,
    durationOverride?: number
  ) => {
    if (!currentEpisode) return

    const now = Date.now()
    if (!force && now - lastPresenceUpdateRef.current < 15000) return

    const safeCurrentTime = Math.max(0, timeOverride ?? currentTime)
    const safeDuration = Math.max(0, durationOverride ?? duration)

    const payload: DiscordActivityPayload = {
      animeTitle: currentEpisode.folderPath.split(/[\\/]/).pop() || currentEpisode.title,
      episodeNumber: parseEpisodeNumber(currentEpisode.title),
      currentTime: formatTime(safeCurrentTime),
      duration: formatTime(safeDuration),
      currentTimeSeconds: safeCurrentTime,
      durationSeconds: safeDuration,
      isPlaying: playing
    }

    try {
      await window.api.discord.updateActivity(payload)
      lastPresenceUpdateRef.current = now
    } catch (error) {
      console.warn('Failed to sync Discord presence', error)
    }
  }

  useEffect(() => {
    window.api.discord.connect().catch((error) => {
      console.warn('Discord RPC connect warning', error)
    })

    return () => {
      window.api.discord.clearActivity().catch(() => undefined)
      window.api.discord.disconnect().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!currentEpisode) {
      window.api.discord.clearActivity().catch(() => undefined)
      lastPresenceUpdateRef.current = 0
      return
    }

    void syncDiscordPresence(isPlaying, true)
  }, [currentEpisode])

  const handleSkipDataSave = async (newSkipData: SkipTimestamps) => {
    if (currentEpisode) {
      await updateSkipData({ ...newSkipData })
    }
  }

  if (!currentEpisode) {
    return (
      <div className="flex-1 bg-dark-950 flex items-center justify-center">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          title="No episode selected"
          description="Select an episode from the list to start watching"
        />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-dark-950 relative group">
      <video
        ref={videoRef}
        src={videoSrc}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => {
          onPlay()
          const video = videoRef.current
          void syncDiscordPresence(true, true, video?.currentTime ?? currentTime, video?.duration ?? duration)
        }}
        onPause={() => {
          onPause()
          const video = videoRef.current
          void syncDiscordPresence(
            false,
            true,
            video?.currentTime ?? currentTime,
            video?.duration ?? duration
          )
        }}
        onTimeUpdate={() => {
          const video = videoRef.current
          onTimeUpdate()
          void syncDiscordPresence(
            isPlaying,
            false,
            video?.currentTime ?? currentTime,
            video?.duration ?? duration
          )
        }}
        onError={onError}
        className="w-full h-full"
      >
        {subtitleSrc && (
          <track
            kind="subtitles"
            src={subtitleSrc}
            srcLang="en"
            label={selectedSubtitle?.label || 'Subtitle'}
            default
          />
        )}
      </video>

      {/* Overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <PlayerControls
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          isMuted={isMute}
          volume={volume}
          subtitles={currentEpisode.subtitles}
          selectedSubtitle={selectedSubtitle}
          skipData={skipData?.[currentEpisode.filePath]}
          onPlayPause={togglePlay}
          onSeek={setSeek}
          onVolumeChange={setVolume}
          onMuteToggle={toggleMute}
          onSubtitleSelect={setSelectedSubtitle}
          onFullscreen={toggleFullscreen}
          onSkipDataSave={handleSkipDataSave}
        />
      </div>

      <SkipOverlay
        currentTime={currentTime}
        skipData={skipData?.[currentEpisode.filePath]}
        onSkip={setSeek}
      />

      <AutoplayCountdown countdown={countdown} onCancel={cancelAutoplay} />
    </div>
  )
}
