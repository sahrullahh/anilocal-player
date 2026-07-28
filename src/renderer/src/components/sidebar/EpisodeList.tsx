import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../store/player.store'
import { useLibrarySettingsStore } from '../../store/library-settings.store'
import { EmptyState } from '../common/EmptyState'
import type { Episode } from '../../types/anime'

// Module-level cache so switching between anime / re-rendering the list doesn't
// re-trigger ffmpeg extraction + file:// conversion for episodes already resolved.
const thumbnailUrlCache = new Map<string, string>()

// ── Concurrency-limited generation queue ────────────────────────────────────
// Generating a thumbnail spawns an ffmpeg process. Without a limit, opening a
// folder with many episodes would spawn dozens of ffmpeg processes at once and
// freeze the app. Only a few run at a time; the rest wait in the queue.
const MAX_CONCURRENT_THUMBNAILS = 3
let activeThumbnailJobs = 0
const thumbnailQueue: Array<() => void> = []

function runNextInQueue(): void {
  if (activeThumbnailJobs >= MAX_CONCURRENT_THUMBNAILS) return
  const next = thumbnailQueue.shift()
  if (!next) return
  activeThumbnailJobs++
  next()
}

function enqueueThumbnailJob(job: () => Promise<void>): void {
  thumbnailQueue.push(() => {
    job().finally(() => {
      activeThumbnailJobs--
      runNextInQueue()
    })
  })
  runNextInQueue()
}

function EpisodeThumbnail({
  episode,
  /** `sm` = the 80×48 sidebar strip, `lg` = full-width 16:9 for the grid. */
  size = 'sm'
}: {
  episode: Episode
  size?: 'sm' | 'lg'
}) {
  const [url, setUrl] = useState<string | null>(thumbnailUrlCache.get(episode.filePath) ?? null)
  const [failed, setFailed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Only start generating once the row has actually scrolled into view
  const [isVisible, setIsVisible] = useState(false)

  // Lazy-trigger: observe visibility so off-screen rows never spawn ffmpeg jobs.
  useEffect(() => {
    if (thumbnailUrlCache.has(episode.filePath)) return
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { root: el.closest('.overflow-y-auto'), rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [episode.filePath])

  useEffect(() => {
    const cached = thumbnailUrlCache.get(episode.filePath)
    if (cached) {
      setUrl(cached)
      return
    }
    if (!isVisible) return

    setUrl(null)
    setFailed(false)
    let cancelled = false

    enqueueThumbnailJob(async () => {
      if (cancelled) return
      const p = await window.api.generateThumbnail(episode.filePath)
      if (cancelled) return
      if (!p) {
        setFailed(true)
        return
      }
      // Convert the raw filesystem path to a proper file:// URL
      // (a naive `file://${p}` breaks on Windows due to backslashes/drive letters)
      const fileUrl = await window.api.toFileUrl(p)
      if (cancelled) return
      thumbnailUrlCache.set(episode.filePath, fileUrl)
      setUrl(fileUrl)
    })

    return () => {
      cancelled = true
    }
  }, [episode.filePath, isVisible])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-dark-800 ${
        size === 'lg' ? 'w-full aspect-video rounded-lg' : 'flex-shrink-0 w-20 h-12 rounded-md'
      }`}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {!failed ? (
            <div className="w-4 h-4 border-2 border-dark-600 border-t-gray-400 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  )
}

export function EpisodeList({
  onClose,
  /**
   * `sidebar` — the narrow vertical list on the right (used while settings are
   * open and while a video is playing).
   * `grid` — full-width horizontal card grid, shown right after a folder is
   * picked, sitting flush against the library list.
   */
  variant = 'sidebar'
}: {
  onClose?: () => void
  variant?: 'sidebar' | 'grid'
}) {
  const { playlist, currentEpisode, playEpisode, progressData, skipData } = usePlayerStore()
  const { centerMode, selectedAnime, selectedEpisode, selectEpisode, setCenterMode } =
    useLibrarySettingsStore()

  const isGrid = variant === 'grid'
  const isSettingsMode = centerMode === 'library-settings'

  // `selectedAnime.name` carries the whole chain for sub-folders, e.g.
  // "Videos / Nvidia / The Forest". Show the opened folder as the title and
  // keep the parents as a smaller breadcrumb above it.
  const nameSegments = (selectedAnime?.name ?? '').split(' / ').filter(Boolean)
  const folderTitle = nameSegments[nameSegments.length - 1] ?? 'Episodes'
  const folderParents = nameSegments.slice(0, -1).join(' / ')

  const getProgress = (episode: Episode) => {
    const progress = progressData[episode.filePath]
    if (!progress) return null
    const percentage = progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0
    return { percentage, watched: progress.watched }
  }

  const getSkipBadges = (episode: Episode) => {
    const d = skipData?.[episode.filePath]
    const badges: string[] = []
    // Show fansub group badge if detected
    if (episode.fansubInfo?.fansubGroup) badges.push(episode.fansubInfo.fansubGroup)
    if (episode.subtitles?.length > 0) {
      // Show highest priority format
      const fmtBadge = episode.subtitles[0].extension.replace('.', '').toUpperCase()
      badges.push(fmtBadge)
    }
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
      // From the grid the center area is showing episodes, so hand it back to
      // the player. Harmless when already in player mode.
      if (isGrid) setCenterMode('player')
    }
  }

  const Header = () => (
    <div className="p-4 border-b border-dark-800 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-white">Episodes in library</h2>
        {playlist.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">{playlist.length} videos</p>
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )

  // ── Full-width grid ──────────────────────────────────────────────────────
  // Same data, same handlers as the sidebar; only the arrangement differs.
  if (isGrid) {
    return (
      <div className="flex-1 min-w-0 bg-dark-950 flex flex-col h-full overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500 truncate">
              {folderParents || 'Episodes in library'}
            </p>
            <h2 className="text-2xl font-semibold text-white truncate" title={selectedAnime?.name}>
              {folderTitle}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{playlist.length} videos</p>
          </div>
          <button
            type="button"
            onClick={() => setCenterMode('library-settings')}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-200 text-sm font-medium transition-colors"
            title="Open folder settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            Folder Settings
          </button>
        </div>

        {playlist.length === 0 ? (
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
              title="No episodes in this folder"
              description="Pick another folder, or open Folder Settings"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* Card count adapts from small laptops through to ultrawide. */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
              {playlist.map((episode, index) => {
                const progress = getProgress(episode)
                const badges = getSkipBadges(episode)
                const isActive = currentEpisode?.id === episode.id

                return (
                  <div
                    key={episode.id}
                    onClick={() => handleEpisodeClick(episode)}
                    className={`group cursor-pointer rounded-xl p-2 transition-colors ${
                      isActive ? 'bg-blue-600' : 'hover:bg-dark-900'
                    }`}
                  >
                    <div className="relative">
                      <EpisodeThumbnail episode={episode} size="lg" />
                      <span className="absolute bottom-1.5 left-1.5 min-w-6 px-1.5 h-6 rounded flex items-center justify-center text-xs font-medium bg-black/70 text-gray-100">
                        {index + 1}
                      </span>
                      {progress?.watched && (
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-0.5">
                          <svg
                            className="w-4 h-4 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                      {progress && !progress.watched && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div
                            className="h-full bg-blue-400"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <h3
                      className={`mt-2 px-1 text-sm font-medium leading-snug line-clamp-2 ${
                        isActive ? 'text-white' : 'text-gray-200'
                      }`}
                      title={episode.fileName}
                    >
                      {episode.fileName}
                    </h3>

                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 px-1">
                        {badges.map((badge, bi) => {
                          const isFansubBadge =
                            episode.fansubInfo?.fansubGroup &&
                            bi === 0 &&
                            badge === episode.fansubInfo.fansubGroup
                          return (
                            <span
                              key={badge + bi}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-24 ${
                                isActive
                                  ? 'bg-blue-500/50 text-blue-100'
                                  : isFansubBadge
                                    ? 'bg-purple-900/60 text-purple-300'
                                    : 'bg-dark-800 text-gray-400'
                              }`}
                              title={isFansubBadge ? `Fansub: ${badge}` : badge}
                            >
                              {isFansubBadge ? `[${badge}]` : badge}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

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
                  {/* Thumbnail with episode number badge overlay */}
                  <div className="relative flex-shrink-0">
                    <EpisodeThumbnail episode={episode} />
                    <span
                      className={`absolute bottom-1 left-1 w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium ${
                        isActive ? 'bg-blue-700 text-white' : 'bg-black/70 text-gray-200'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-sm leading-snug">
                      {episode.fileName}
                    </h3>

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {badges.map((badge, bi) => {
                          // First badge is fansub group (if present), color it distinctly
                          const isFansubBadge =
                            episode.fansubInfo?.fansubGroup &&
                            bi === 0 &&
                            badge === episode.fansubInfo.fansubGroup
                          return (
                            <span
                              key={badge + bi}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-24 ${
                                isActive
                                  ? 'bg-blue-500/50 text-blue-100'
                                  : isFansubBadge
                                    ? 'bg-purple-900/60 text-purple-300'
                                    : 'bg-dark-700 text-gray-400'
                              }`}
                              title={isFansubBadge ? `Fansub: ${badge}` : badge}
                            >
                              {isFansubBadge ? `[${badge}]` : badge}
                            </span>
                          )
                        })}
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
                          <svg
                            className="w-3.5 h-3.5 text-green-500 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
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
