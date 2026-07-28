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
import { useSettingsStore } from '../../store/settings.store'
import { PlayerControls } from './PlayerControls'
import { SkipOverlay } from './SkipOverlay'
import { AutoplayCountdown } from './AutoplayCountdown'
import { AssRenderer } from './AssRenderer'
import { BufferingSpinner } from './BufferingSpinner'
import { LibrarySettings } from '../library/LibrarySettings'
import { EpisodeList } from '../sidebar/EpisodeList'
import { useOpenMedia } from '../../hooks/useOpenMedia'
import type { SkipTimestamps } from '../../types/anime'
import type { DiscordActivityPayload } from '../../types/electron-api'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatTime } from '../../utils/time'
import appLogo from '../../assets/app_logo.png'

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
  const { currentEpisode, skipData, updateSkipData } = usePlayerStore()
  const { addFolder } = useLibraryStore()
  const { centerMode } = useLibrarySettingsStore()
  const { autoSkipIntroOutro } = useSettingsStore()
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

  const {
    selectedSubtitle,
    subtitleSrc,
    assContent,
    isAssSubtitle,
    fontUrls,
    setSelectedSubtitle,
    cycleSubtitle,
    disableSubtitle
  } = useSubtitle(mergedSubtitles, currentEpisode?.filePath)

  // ── Buffering state ───────────────────────────────────────────────────────
  // true when video fires `waiting` (needs data) or when a new src is set,
  // false when `canplay` / `playing` fires.
  const [isBuffering, setIsBuffering] = useState(false)

  // Reset buffering indicator whenever a new episode is loaded
  useEffect(() => {
    if (currentEpisode) setIsBuffering(true)
  }, [currentEpisode])

  const { countdown, episodeEnded, cancelAutoplay, dismissEnded } = useAutoplay(videoRef)
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
    disableSubtitle,
    toggleLibrary: onToggleLibrary,
    toggleEpisodes: onToggleEpisodes
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleClick = () => togglePlay()
    video.addEventListener('click', handleClick)

    return () => video.removeEventListener('click', handleClick)
  }, [videoRef, togglePlay])

  // ── Auto skip intro/outro ───────────────────────────────────────────────
  // When enabled, automatically seeks past the intro/outro range as soon as
  // playback enters it, instead of waiting for the user to click Skip.
  const autoSkippedRangeRef = useRef<string | null>(null)
  useEffect(() => {
    // Reset the "already skipped" guard whenever the episode changes
    autoSkippedRangeRef.current = null
  }, [currentEpisode?.filePath])

  useEffect(() => {
    if (!autoSkipIntroOutro || !currentEpisode) return
    const current = skipData?.[currentEpisode.filePath]
    if (!current) return

    if (
      current.introStart !== undefined &&
      current.introEnd !== undefined &&
      currentTime >= current.introStart &&
      currentTime < current.introEnd
    ) {
      const rangeKey = `intro:${current.introStart}:${current.introEnd}`
      if (autoSkippedRangeRef.current !== rangeKey) {
        autoSkippedRangeRef.current = rangeKey
        setSeek(current.introEnd)
      }
      return
    }

    if (
      current.outroStart !== undefined &&
      current.outroEnd !== undefined &&
      currentTime >= current.outroStart &&
      currentTime < current.outroEnd
    ) {
      const rangeKey = `outro:${current.outroStart}:${current.outroEnd}`
      if (autoSkippedRangeRef.current !== rangeKey) {
        autoSkippedRangeRef.current = rangeKey
        setSeek(current.outroEnd)
      }
    }
  }, [autoSkipIntroOutro, currentEpisode, skipData, currentTime, setSeek])

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

  // Shared with the File menu in the title bar, so both paths run identical code.
  const { openFile: handleOpenFile } = useOpenMedia()

  // Episode browsing mode — full-width episode grid, flush against the library
  // list. Handled here (rather than in App) so the player's hooks stay mounted,
  // matching how library-settings mode already works.
  if (centerMode === 'episodes') {
    return <EpisodeList variant="grid" />
  }

  // Library settings mode — show settings panel instead of player/landing
  if (centerMode === 'library-settings') {
    return <LibrarySettings />
  }

  if (!currentEpisode) {
    return (
      <div className="flex-1 bg-dark-950 flex flex-col items-center justify-center gap-8 select-none">
        {/* App logo / icon */}
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <img
            src={appLogo}
            alt="AniLocal Player"
            draggable={false}
            className="w-24 h-24 object-contain select-none opacity-80"
          />
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
            void syncDiscordPresence(
              true,
              true,
              video?.currentTime ?? currentTime,
              video?.duration ?? duration
            )
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

      {/* Watermark logo — always visible, top-right, independent of controls hide/show */}
      <img
        src="/wm.png"
        alt=""
        draggable={false}
        className="absolute top-4 right-5 h-14 w-auto object-contain opacity-1 pointer-events-none select-none z-30"
      />

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
      <style>
        {isFullscreen && isPlaying && !controlsVisible ? `* { cursor: none !important; }` : ''}
      </style>

      {!autoSkipIntroOutro && (
        <SkipOverlay
          currentTime={currentTime}
          skipData={skipData?.[currentEpisode.filePath]}
          onSkip={setSeek}
        />
      )}

      <AutoplayCountdown
        countdown={countdown}
        episodeEnded={episodeEnded}
        onCancel={cancelAutoplay}
        onDismissEnded={dismissEnded}
      />
    </div>
  )
}
