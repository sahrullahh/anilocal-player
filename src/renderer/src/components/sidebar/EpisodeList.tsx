import { usePlayerStore } from '../../store/player.store'
import { useLibrarySettingsStore } from '../../store/library-settings.store'
import { EmptyState } from '../common/EmptyState'
import type { Episode } from '../../types/anime'

export function EpisodeList({ onClose }: { onClose?: () => void }) {
  const { playlist, currentEpisode, playEpisode, progressData, skipData } = usePlayerStore()
  const { centerMode, selectedEpisode, selectEpisode } = useLibrarySettingsStore()

  const isSettingsMode = centerMode === 'library-settings'

  const getProgress = (episode: Episode) => {
    const progress = progressData[episode.filePath]
    if (!progress) return null
    const percentage = progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0
    return { percentage, watched: progress.watched }
  }

  const getSkipBadges = (episode: Episode) => {
    const d = skipData?.[episode.filePath]
    const badges: string[] = []
    if (episode.subtitles?.length > 0) badges.push('SUB')
    if (d?.introEnd != null) badges.push('INTRO')
    if (d?.outroEnd != null) badges.push('OUTRO')
    return badges
  }

  const handleEpisodeClick = (episode: Episode) => {
    if (isSettingsMode) {
      // In settings mode: just select, don't play
      selectEpisode(episode)
    } else {
      // Normal mode: play immediately
      playEpisode(episode)
    }
  }

  const Header = () => (
    <div className="p-4 border-b border-dark-800 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-white">Episodes</h2>
        {playlist.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">{playlist.length} episodes</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-dark-800 transition-colors"
          title="Close episodes"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )

  if (playlist.length === 0) {
    return (
      <div className="w-72 bg-dark-900 border-l border-dark-800 flex flex-col h-full">
        <Header />
        <div className="flex-1">
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            title="No episodes"
            description="Select an anime from the library"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 bg-dark-900 border-l border-dark-800 flex flex-col h-full">
      <Header />

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {playlist.map((episode, index) => {
            const progress = getProgress(episode)
            const badges = getSkipBadges(episode)

            // Active highlight logic depends on mode
            const isActive = isSettingsMode
              ? selectedEpisode?.id === episode.id
              : currentEpisode?.id === episode.id

            return (
              <div
                key={episode.id}
                className={`relative rounded-lg p-3 cursor-pointer transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'hover:bg-dark-800 text-gray-300'
                }`}
                onClick={() => handleEpisodeClick(episode)}
              >
                <div className="flex items-start gap-3">
                  {/* Episode number */}
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-medium ${
                      isActive ? 'bg-blue-700' : 'bg-dark-800'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-sm leading-snug">{episode.fileName}</h3>

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {badges.map((badge) => (
                          <span
                            key={badge}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isActive
                                ? 'bg-blue-500/50 text-blue-100'
                                : 'bg-dark-700 text-gray-400'
                            }`}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress bar */}
                    {progress && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-0.5 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${progress.watched ? 'bg-green-500' : 'bg-blue-400'}`}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        {progress.watched && (
                          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settings mode hint */}
      {isSettingsMode && (
        <div className="px-3 py-2 border-t border-dark-800 text-xs text-gray-600 text-center">
          Click to select · Play from settings
        </div>
      )}
    </div>
  )
}
