import { useState } from 'react'
import { formatTime, parseTime } from '../../utils/time'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { SubtitleMenu } from './SubtitleMenu'
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
  onPlayPause: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
  onSubtitleSelect: (subtitle: Subtitle | null) => void
  onFullscreen: () => void
  onSkipDataSave?: (skipData: SkipTimestamps) => void
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
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onSubtitleSelect,
  onFullscreen,
  onSkipDataSave
}: PlayerControlsProps) {
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [isSkipEditOpen, setIsSkipEditOpen] = useState(false)
  const [editSkipData, setEditSkipData] = useState<SkipTimestamps>(skipData || {})

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    onSeek(percent * duration)
  }

  const handleSaveSkipData = () => {
    onSkipDataSave?.(editSkipData)
    setIsSkipEditOpen(false)
  }

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-dark-700 rounded-full cursor-pointer hover:h-2 transition-all mb-4 group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all group-hover:bg-blue-500"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-400 mb-4">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={onPlayPause} variant="ghost" size="sm" className="!p-2">
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.75 1.5A.75.75 0 005 2.25v15.5a.75.75 0 001.5 0V2.25A.75.75 0 005.75 1.5zm8.5 0a.75.75 0 00-.75.75v15.5a.75.75 0 001.5 0V2.25a.75.75 0 00-.75-.75z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
            </Button>

            <div className="flex items-center gap-1">
              <Button onClick={onMuteToggle} variant="ghost" size="sm" className="!p-2">
                {isMuted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.172a1 1 0 011.414 0A6.972 6.972 0 0118 10a6.972 6.972 0 01-1.929 4.828 1 1 0 01-1.414-1.414A4.972 4.972 0 0016 10c0-1.713-.672-3.259-1.757-4.364a1 1 0 010-1.414z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 2.172a1 1 0 011.414 0 8 8 0 010 11.314 1 1 0 01-1.414-1.414 6 6 0 000-8.486 1 1 0 010-1.414zM12.586 4.172a1 1 0 011.414 0 4 4 0 010 5.656 1 1 0 01-1.414-1.414 2 2 0 000-2.828 1 1 0 010-1.414z" />
                  </svg>
                )}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-dark-700 rounded-full cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Skip Edit Button */}
            <Button
              onClick={() => setIsSkipEditOpen(true)}
              variant="ghost"
              size="sm"
              className="!p-2"
              title="Edit skip intro/outro"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1 1 0 00.95.69h.969c.969 0 1.371 1.24.588 1.81l-.784.57a1 1 0 00-.364 1.118l.3.922c.3.921-.755 1.688-1.538 1.118l-.784-.57a1 1 0 00-1.176 0l-.784.57c-.783.57-1.838-.197-1.539-1.118l.3-.922a1 1 0 00-.363-1.118l-.784-.57c-.783-.57-.38-1.81.588-1.81h.969a1 1 0 00.95-.69z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Button>

            {/* Subtitles Menu */}
            {subtitles.length > 0 && (
              <div className="relative">
                <Button
                  onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                  variant="ghost"
                  size="sm"
                  className="!p-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4"
                    />
                  </svg>
                </Button>
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
              </div>
            )}

            {/* Fullscreen */}
            <Button onClick={onFullscreen} variant="ghost" size="sm" className="!p-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Skip Edit Modal */}
      <Modal
        isOpen={isSkipEditOpen}
        onClose={() => setIsSkipEditOpen(false)}
        title="Edit Skip Timestamps"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Intro Start</label>
              <input
                type="text"
                placeholder="0:00"
                value={
                  editSkipData.introStart !== undefined ? formatTime(editSkipData.introStart) : ''
                }
                onChange={(e) =>
                  setEditSkipData({
                    ...editSkipData,
                    introStart: e.target.value ? parseTime(e.target.value) : undefined
                  })
                }
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Intro End</label>
              <input
                type="text"
                placeholder="0:00"
                value={editSkipData.introEnd !== undefined ? formatTime(editSkipData.introEnd) : ''}
                onChange={(e) =>
                  setEditSkipData({
                    ...editSkipData,
                    introEnd: e.target.value ? parseTime(e.target.value) : undefined
                  })
                }
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Outro Start</label>
              <input
                type="text"
                placeholder="0:00"
                value={
                  editSkipData.outroStart !== undefined ? formatTime(editSkipData.outroStart) : ''
                }
                onChange={(e) =>
                  setEditSkipData({
                    ...editSkipData,
                    outroStart: e.target.value ? parseTime(e.target.value) : undefined
                  })
                }
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Outro End</label>
              <input
                type="text"
                placeholder="0:00"
                value={editSkipData.outroEnd !== undefined ? formatTime(editSkipData.outroEnd) : ''}
                onChange={(e) =>
                  setEditSkipData({
                    ...editSkipData,
                    outroEnd: e.target.value ? parseTime(e.target.value) : undefined
                  })
                }
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsSkipEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveSkipData}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
