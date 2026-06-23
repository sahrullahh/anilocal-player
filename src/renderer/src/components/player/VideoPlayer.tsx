import { useVideoPlayer } from '../../hooks/useVideoPlayer'
import { useSubtitle } from '../../hooks/useSubtitle'
import { useEmbeddedTracks } from '../../hooks/useEmbeddedTracks'
import { useVideoFps } from '../../hooks/useVideoFps'
import { useAutoplay } from '../../hooks/useAutoplay'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useIdleMouseHide } from '../../hooks/useIdleMouseHide'
import { usePlayerStore } from '../../store/player.store'
import { useLibraryStore } from '../../store/library.store'
import { useLibrarySettingsStore } from '../../store/library-settings.store'
import { PlayerControls } from './PlayerControls'
import { SkipOverlay } from './SkipOverlay'
import { AutoplayCountdown } from './AutoplayCountdown'
import { AssRenderer } from './AssRenderer'
import { BufferingSpinner } from './BufferingSpinner'
import { LibrarySettings } from '../library/LibrarySettings'
import type { SkipTimestamps } from '../../types/anime'
import type { DiscordActivityPayload } from '../../types/electron-api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatTime } from '../../utils/time'
import { v4 as uuidv4 } from 'uuid'
import type { Anime } from '../../types/anime'

export function VideoPlayer({
  showLibrary,
  showEpisodes,
  onToggleLibrary,
  onToggleEpisodes
}: {
  showLibrary: boolean
  showEpisodes: boolean
  onToggleLibrary: () => void
  onToggleEpisodes: () => void
}) {
  const { currentEpisode, skipData, updateSkipData, playEpisode, setPlaylist } = usePlayerStore()
  const { addFolder } = useLibraryStore()
  const { centerMode, setCenterMode } = useLibrarySettingsStore()
  const {
    videoRef,
    videoSrc,
    currentTime,
    duration,
    isPlaying,
    isFullscreen,
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

  // Probe embedded subtitle tracks for MKV episodes
  const embeddedSubtitles = useEmbeddedTracks(currentEpisode)
  // Detect actual video FPS for frame-accurate subtitle rendering
  const videoFps = useVideoFps(currentEpisode)

  // Merge: embedded tracks prepended before the episode's external tracks.
  // useMemo prevents a new array identity on every render, which would cause
  // useSubtitle's identity check to reset subtitle selection every frame.
  const mergedSubtitles = useMemo(
    () => [...embeddedSubtitles, ...(currentEpisode?.subtitles ?? [])],
    [embeddedSubtitles, currentEpisode?.subtitles]
  )

  const { selectedSubtitle, subtitleSrc, assContent, isAssSubtitle, fontUrls, setSelectedSubtitle, cycleSubtitle, disableSubtitle } = useSubtitle(
    mergedSubtitles,
    currentEpisode?.filePath
  )

  // ── Buffering state ───────────────────────────────────────────────────────
  // true when video fires `waiting` (needs data) or when a new src is set,
  // false when `canplay` / `playing` fires.
  const [isBuffering, setIsBuffering] = useState(false)

  // Reset buffering indicator whenever a new episode is loaded
  useEffect(() => {
    if (currentEpisode) setIsBuffering(true)
  }, [currentEpisode])

  const { countdown, cancelAutoplay } = useAutoplay(videoRef)
  const { controlsVisible } = useIdleMouseHide(isFullscreen, isPlaying)
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
    },
    cycleSubtitle,
    disableSubtitle
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

    void window.api.discord.setIdleActivity().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!currentEpisode) {
      void window.api.discord.setIdleActivity().catch(() => undefined)
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

  const handleOpenFile = useCallback(async () => {
    try {
      const filePath = await window.api.selectFile()
      if (!filePath) return

      const folderPath = filePath.substring(
        0,
        Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
      )
      const scanResult = await window.api.scanFolder(folderPath)

      const anime: Anime = {
        id: uuidv4(),
        name: scanResult.name,
        path: scanResult.path,
        episodes: scanResult.episodes
      }

      setPlaylist(anime.episodes)
      const target = anime.episodes.find((ep) => ep.filePath === filePath) ?? anime.episodes[0]
      if (target) {
        playEpisode(target)
        setCenterMode('player')
      }
    } catch (err) {
      console.error('Failed to open file', err)
    }
  }, [playEpisode, setPlaylist, setCenterMode])

  // Library settings mode — show settings panel instead of player/landing
  if (centerMode === 'library-settings') {
    return <LibrarySettings />
  }

  if (!currentEpisode) {
    return (
      <div className="flex-1 bg-dark-950 flex flex-col items-center justify-center gap-8 select-none">
        {/* App logo / icon */}
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-2xl font-semibold text-gray-400 tracking-wide">Anilocal Player</h1>
          <p className="text-sm text-gray-600">No video playing</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Open File */}
          <button
            type="button"
            onClick={handleOpenFile}
            className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/30 min-w-44 justify-center"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            Open File
          </button>

          {/* Open Library */}
          <button
            type="button"
            onClick={onToggleLibrary}
            className="flex items-center gap-3 px-6 py-3 bg-dark-800 hover:bg-dark-700 active:bg-dark-900 text-gray-200 rounded-xl font-medium transition-colors border border-dark-700 min-w-44 justify-center"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Browse Library
          </button>

          {/* Add Folder */}
          <button
            type="button"
            onClick={addFolder}
            className="flex items-center gap-3 px-6 py-3 bg-dark-800 hover:bg-dark-700 active:bg-dark-900 text-gray-200 rounded-xl font-medium transition-colors border border-dark-700 min-w-44 justify-center"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Folder
          </button>
        </div>

        <p className="text-xs text-gray-700 mt-2">
          Developed by Mohammad Sahrullah. Powered by AI.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-dark-950 relative group">
      {/* Video + subtitle overlay wrapper — isolates SubtitlesOctopus canvas
          so it only covers the video area, not the controls bar */}
      <div className="absolute inset-0">
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
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onPlaying={() => setIsBuffering(false)}
          className="w-full h-full"
        >
          {/* Only use <track> for non-ASS formats (VTT/SRT-converted-to-VTT) */}
          {subtitleSrc && !isAssSubtitle && (
            <track
              kind="subtitles"
              src={subtitleSrc}
              srcLang="und"
              label={selectedSubtitle?.label || 'Subtitle'}
              default
            />
          )}
        </video>

        {/* ASS/SSA renderer — SubtitlesOctopus appends its canvas here,
            inside this wrapper so it stays within the video area */}
        {isAssSubtitle && assContent && (
          <AssRenderer
            assContent={assContent}
            videoRef={videoRef}
            visible={!!selectedSubtitle}
            fonts={fontUrls}
            targetFps={videoFps}
          />
        )}

        {/* Buffering / loading indicator */}
        <BufferingSpinner visible={isBuffering} />
      </div>

      {/* Overlay: always visible when paused, hover-based when playing outside fullscreen, idle-timer-based when playing in fullscreen */}
      <div
        className={[
          'absolute inset-0 transition-opacity duration-300 z-20',
          !isPlaying || controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        ].join(' ')}
      >
        <PlayerControls
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          isMuted={isMute}
          volume={volume}
          subtitles={mergedSubtitles}
          selectedSubtitle={selectedSubtitle}
          skipData={skipData?.[currentEpisode.filePath]}
          videoTitle={currentEpisode.fileName}
          showLibrary={showLibrary}
          showEpisodes={showEpisodes}
          onPlayPause={togglePlay}
          onSeek={setSeek}
          onSeekRelative={seek}
          onVolumeChange={setVolume}
          onMuteToggle={toggleMute}
          onSubtitleSelect={setSelectedSubtitle}
          onCycleSubtitle={cycleSubtitle}
          onDisableSubtitle={disableSubtitle}
          onFullscreen={toggleFullscreen}
          onSkipDataSave={handleSkipDataSave}
          onToggleLibrary={onToggleLibrary}
          onToggleEpisodes={onToggleEpisodes}
        />
      </div>

      {/* Cursor: hide only when playing and controls are hidden in fullscreen */}
      <style>{isFullscreen && isPlaying && !controlsVisible ? `* { cursor: none !important; }` : ''}</style>

      <SkipOverlay
        currentTime={currentTime}
        skipData={skipData?.[currentEpisode.filePath]}
        onSkip={setSeek}
      />

      <AutoplayCountdown countdown={countdown} onCancel={cancelAutoplay} />
    </div>
  )
}
