import { useState } from 'react'
import { formatTime, parseTime } from '../../utils/time'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { SubtitleMenu } from './SubtitleMenu'
import { useSettingsStore } from '../../store/settings.store'
import { usePlayerStore } from '../../store/player.store'
import type { Subtitle, SkipTimestamps } from '../../types/anime'

type PlayerControlsProps = {
  currentTime: number
  duration: number
  isPlaying: boolean
  isMuted: boolean
  volume: number
  subtitles: Subtitle[]
  selectedSubtitle: Subtitle | null
  skipData?: SkipTimestamps
  videoTitle?: string
  showLibrary?: boolean
  showEpisodes?: boolean
  onPlayPause: () => void
  onSeek: (time: number) => void
  onSeekRelative: (seconds: number) => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
  onSubtitleSelect: (subtitle: Subtitle | null) => void
  onCycleSubtitle: () => void
  onDisableSubtitle: () => void
  onFullscreen: () => void
  onSkipDataSave?: (skipData: SkipTimestamps) => void
  onToggleLibrary?: () => void
  onToggleEpisodes?: () => void
}

export function PlayerControls({
  currentTime,
  duration,
  isPlaying,
  isMuted,
  volume,
  subtitles,
  selectedSubtitle,
  skipData,
  videoTitle,
  showLibrary,
  showEpisodes,
  onPlayPause,
  onSeek,
  onSeekRelative,
  onVolumeChange,
  onMuteToggle,
  onSubtitleSelect,
  onCycleSubtitle,
  onDisableSubtitle,
  onFullscreen,
  onSkipDataSave,
  onToggleLibrary,
  onToggleEpisodes
}: PlayerControlsProps) {
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [isSkipEditOpen, setIsSkipEditOpen] = useState(false)
  const [editSkipData, setEditSkipData] = useState<SkipTimestamps>(skipData || {})

  const { repeat, setRepeat, autoplay, setAutoplay } = useSettingsStore()
  const { playNext, playPrevious, playlist, currentEpisode } = usePlayerStore()

  // onDisableSubtitle is wired via keyboard shortcut (Shift+T) from VideoPlayer
  void onDisableSubtitle

  const currentIndex = playlist.findIndex((ep) => ep.id === currentEpisode?.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < playlist.length - 1

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    onSeek(percent * duration)
  }

  const handleSaveSkipData = () => {
    onSkipDataSave?.(editSkipData)
    setIsSkipEditOpen(false)
  }

  const handleToggleRepeat = () => {
    const next = !repeat
    setRepeat(next)
    // Turning repeat on → disable autoplay; turning off → restore autoplay
    if (next) setAutoplay(false)
  }

  return (
    <>
      {/* Video title + fansub indicator - top left */}
      {videoTitle && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent px-4 pt-4 pb-8 pointer-events-none">
          <p className="text-sm text-white/90 font-medium truncate drop-shadow max-w-lg">
            {videoTitle}
          </p>
          {/* Fansub active indicator */}
          {selectedSubtitle && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/60 bg-black/40 rounded px-2 py-0.5">
                Subtitle: {selectedSubtitle.language} ({selectedSubtitle.extension.replace('.', '').toUpperCase()})
              </span>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-dark-700 rounded-full cursor-pointer hover:h-2 transition-all mb-3 group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all group-hover:bg-blue-500"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-400 mb-3">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* ── Controls row ── */}
        <div className="flex items-center justify-between">

          {/* LEFT: library toggle, episode toggle, volume */}
          <div className="flex items-center gap-1 flex-1">
            <Button
              onClick={onToggleLibrary}
              variant="ghost" size="sm" className={`!p-2 ${showLibrary ? 'text-blue-400' : ''}`}
              title={showLibrary ? 'Hide Library' : 'Show Library'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </Button>

            <Button
              onClick={onToggleEpisodes}
              variant="ghost" size="sm" className={`!p-2 ${showEpisodes ? 'text-blue-400' : ''}`}
              title={showEpisodes ? 'Hide Episodes' : 'Show Episodes'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-1 ml-1">
              <Button onClick={onMuteToggle} variant="ghost" size="sm" className="!p-2">
                {isMuted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.172a1 1 0 011.414 0A6.972 6.972 0 0118 10a6.972 6.972 0 01-1.929 4.828 1 1 0 01-1.414-1.414A4.972 4.972 0 0016 10c0-1.713-.672-3.259-1.757-4.364a1 1 0 010-1.414z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 2.172a1 1 0 011.414 0 8 8 0 010 11.314 1 1 0 01-1.414-1.414 6 6 0 000-8.486 1 1 0 010-1.414zM12.586 4.172a1 1 0 011.414 0 4 4 0 010 5.656 1 1 0 01-1.414-1.414 2 2 0 000-2.828 1 1 0 010-1.414z" />
                  </svg>
                )}
              </Button>
              <input
                type="range" min="0" max="1" step="0.01" value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-dark-700 rounded-full cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {/* CENTER: prev-episode · seek-10 · play/pause · seek+10 · next-episode */}
          <div className="flex items-center gap-1">
            {/* Prev episode */}
            <Button
              onClick={playPrevious}
              variant="ghost" size="sm" className="!p-2"
              disabled={!hasPrev}
              title="Previous episode"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.445 14.832A1 1 0 0010 14V6a1 1 0 00-1.555-.832l-5 3.5a1 1 0 000 1.664l5 3.5zM17 5a1 1 0 00-1 1v8a1 1 0 002 0V6a1 1 0 00-1-1z" />
              </svg>
            </Button>

            {/* Seek back 10s */}
            <Button
              onClick={() => onSeekRelative(-10)}
              variant="ghost" size="sm" className="!p-2"
              title="Back 10s"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </Button>

            {/* Play / Pause — bigger */}
            <button
              onClick={onPlayPause}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors text-white mx-1"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.75 1.5A.75.75 0 005 2.25v15.5a.75.75 0 001.5 0V2.25A.75.75 0 005.75 1.5zm8.5 0a.75.75 0 00-.75.75v15.5a.75.75 0 001.5 0V2.25a.75.75 0 00-.75-.75z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
            </button>

            {/* Seek forward 10s */}
            <Button
              onClick={() => onSeekRelative(10)}
              variant="ghost" size="sm" className="!p-2"
              title="Forward 10s"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </Button>

            {/* Next episode */}
            <Button
              onClick={playNext}
              variant="ghost" size="sm" className="!p-2"
              disabled={!hasNext}
              title="Next episode"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 5a1 1 0 011 1v8a1 1 0 01-2 0V6a1 1 0 011-1zm10.555 1.168A1 1 0 0012 7v6a1 1 0 001.555.832l5-3.5a1 1 0 000-1.664l-5-3.5z" />
              </svg>
            </Button>
          </div>

          {/* RIGHT: repeat, skip-edit, subtitle, fullscreen */}
          <div className="flex items-center gap-1 flex-1 justify-end">
            {/* Repeat */}
            <Button
              onClick={handleToggleRepeat}
              variant="ghost" size="sm"
              className={`!p-2 ${repeat ? 'text-blue-400' : ''}`}
              title={repeat ? 'Repeat On (click to turn off)' : 'Repeat Off'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>

            {/* Autoplay toggle (shown dimmed when repeat is on) */}
            <Button
              onClick={() => { if (!repeat) setAutoplay(!autoplay) }}
              variant="ghost" size="sm"
              className={`!p-2 ${autoplay && !repeat ? 'text-blue-400' : 'opacity-40'}`}
              title={repeat ? 'Autoplay disabled (repeat is on)' : autoplay ? 'Autoplay On' : 'Autoplay Off'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </Button>

            {/* Skip Edit */}
            <Button
              onClick={() => setIsSkipEditOpen(true)}
              variant="ghost" size="sm" className="!p-2"
              title="Edit skip intro/outro"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1 1 0 00.95.69h.969c.969 0 1.371 1.24.588 1.81l-.784.57a1 1 0 00-.364 1.118l.3.922c.3.921-.755 1.688-1.538 1.118l-.784-.57a1 1 0 00-1.176 0l-.784.57c-.783.57-1.838-.197-1.539-1.118l.3-.922a1 1 0 00-.363-1.118l-.784-.57c-.783-.57-.38-1.81.588-1.81h.969a1 1 0 00.95-.69z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>

            {/* Subtitles */}
            <div className="relative flex items-center gap-0.5">
              {subtitles.length > 0 && (
                <>
                  {/* Subtitle icon button — opens/closes menu */}
                  <Button
                    onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                    variant="ghost"
                    size="sm"
                    className={`!p-2 ${selectedSubtitle ? 'text-blue-400' : ''}`}
                    title="Subtitle tracks (T to cycle, Shift+T to off)"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                  </Button>

                  {/* Active format badge */}
                  {selectedSubtitle && (
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-700 text-purple-100 uppercase cursor-pointer hover:bg-purple-600 transition-colors"
                      onClick={onCycleSubtitle}
                      title="Click to cycle subtitle (T)"
                    >
                      {selectedSubtitle.extension.replace('.', '')}
                    </span>
                  )}

                  {showSubtitleMenu && (
                    <SubtitleMenu
                      subtitles={subtitles}
                      selectedSubtitle={selectedSubtitle}
                      onSelect={(sub) => {
                        onSubtitleSelect(sub)
                        setShowSubtitleMenu(false)
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {/* Fullscreen */}
            <Button onClick={onFullscreen} variant="ghost" size="sm" className="!p-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Skip Edit Modal */}
      <Modal isOpen={isSkipEditOpen} onClose={() => setIsSkipEditOpen(false)} title="Edit Skip Timestamps">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Intro Start', key: 'introStart' },
              { label: 'Intro End', key: 'introEnd' },
              { label: 'Outro Start', key: 'outroStart' },
              { label: 'Outro End', key: 'outroEnd' }
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                <input
                  type="text"
                  placeholder="0:00"
                  value={editSkipData[key as keyof SkipTimestamps] !== undefined
                    ? formatTime(editSkipData[key as keyof SkipTimestamps]!)
                    : ''}
                  onChange={(e) =>
                    setEditSkipData({
                      ...editSkipData,
                      [key]: e.target.value ? parseTime(e.target.value) : undefined
                    })
                  }
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsSkipEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveSkipData}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
