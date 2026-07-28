import { useEffect, useMemo, useState } from 'react'
import { useLibrarySettingsStore } from '../../store/library-settings.store'
import { usePlayerStore } from '../../store/player.store'
import { useLibraryStore } from '../../store/library.store'
import { Button } from '../common/Button'
import type { SkipTimestamps, Episode } from '../../types/anime'

// Module-level cache so revisiting the same anime doesn't re-probe every
// episode's duration via ffprobe again.
const episodeDurationCache = new Map<string, number>()

/** Formats a duration in seconds as a human-readable Indonesian string, e.g. "1 hari 4 jam 12 menit". */
function formatWatchTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '—'
  const totalMinutes = Math.round(totalSeconds / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days} days`)
  if (hours > 0) parts.push(`${hours} hours`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minutes`)
  return parts.join(' ')
}

export function LibrarySettings() {
  const {
    selectedAnime,
    selectedEpisode,
    skipPacks,
    activeSkipPackId,
    setCenterMode,
    importSkipPack,
    setActiveSkipPack,
    removeSkipPack,
    resolveSkipForEpisode
  } = useLibrarySettingsStore()

  const {
    skipData,
    progressData,
    updateSkipData,
    clearSkipForEpisode,
    clearAllSkipData,
    playEpisode
  } = usePlayerStore()
  const { libraries } = useLibraryStore()

  // `selectedAnime` may be scoped to whichever folder/sub-folder the user last
  // opened in the sidebar (Episode List is intentionally non-recursive so it
  // never loads an entire season's videos at once). Stats and total duration
  // below, however, should always reflect the WHOLE anime/season — so look up
  // the un-scoped entry from the library store and use all of its episodes.
  const allEpisodesForStats: Episode[] = useMemo(() => {
    if (!selectedAnime) return []
    const fullAnime = libraries.find((lib) => lib.id === selectedAnime.id)
    return fullAnime?.episodes ?? selectedAnime.episodes
  }, [libraries, selectedAnime])

  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number | null>(null)
  const [isProbingDuration, setIsProbingDuration] = useState(false)

  useEffect(() => {
    if (!selectedAnime) {
      setTotalDurationSeconds(null)
      return
    }
    let cancelled = false
    setIsProbingDuration(true)

    const probeAll = async () => {
      let sum = 0
      for (const episode of allEpisodesForStats) {
        if (cancelled) return
        const cached = episodeDurationCache.get(episode.filePath)
        if (cached != null) {
          sum += cached
          continue
        }
        const seconds = await window.api.probeVideoDuration(episode.filePath)
        if (seconds != null) {
          episodeDurationCache.set(episode.filePath, seconds)
          sum += seconds
        }
      }
      if (!cancelled) {
        setTotalDurationSeconds(sum)
        setIsProbingDuration(false)
      }
    }

    void probeAll()
    return () => {
      cancelled = true
    }
  }, [selectedAnime, allEpisodesForStats])

  if (!selectedAnime) return null

  const animeId = selectedAnime.id
  const packs = skipPacks[animeId] ?? []
  const activePackId = activeSkipPackId[animeId] ?? null

  // `selectedAnime.path` always points at the library root, even when a
  // sub-folder is the one actually open — sub-folder selection only rescopes
  // `name` and `episodes`. The episodes are the direct (non-recursive) children
  // of whatever folder was last clicked, so their `folderPath` is that folder.
  const openedFolderPath = selectedAnime.episodes[0]?.folderPath ?? selectedAnime.path
  const openedFolderName =
    openedFolderPath.split(/[\\/]/).filter(Boolean).pop() ?? selectedAnime.name

  // `name` carries the whole chain for sub-folders, e.g. "Videos / Nvidia / The
  // Forest". Split it so the title is just the folder that was opened.
  const nameSegments = selectedAnime.name.split(' / ').filter(Boolean)
  const folderTitle = nameSegments[nameSegments.length - 1] ?? selectedAnime.name
  const folderParents = nameSegments.slice(0, -1).join(' / ')

  // Stats (always computed from the full, un-scoped episode list for this anime)
  const totalEpisodes = allEpisodesForStats.length
  const episodesWithSubtitle = allEpisodesForStats.filter(
    (ep) => ep.subtitles && ep.subtitles.length > 0
  ).length
  const episodesWithIntro = allEpisodesForStats.filter((ep) => {
    const d = skipData?.[ep.filePath]
    return d?.introEnd != null
  }).length
  const episodesWithOutro = allEpisodesForStats.filter((ep) => {
    const d = skipData?.[ep.filePath]
    return d?.outroEnd != null
  }).length

  // Watched time: for fully-watched episodes, count their full probed duration
  // (not just currentTime, since a "watched" episode may have currentTime near
  // the end rather than exactly at duration). For in-progress episodes, count
  // their actual currentTime.
  const watchedSeconds = allEpisodesForStats.reduce((sum, ep) => {
    const progress = progressData?.[ep.filePath]
    if (!progress) return sum
    if (progress.watched) {
      const fullDuration = episodeDurationCache.get(ep.filePath) ?? progress.duration
      return sum + fullDuration
    }
    return sum + progress.currentTime
  }, 0)
  const remainingSeconds =
    totalDurationSeconds != null ? Math.max(totalDurationSeconds - watchedSeconds, 0) : null

  // ── Import Skip Pack ──────────────────────────────────────────────
  const handleImportSkipPack = async () => {
    setImportError(null)
    setImportSuccess(null)
    try {
      const filePath = await window.api.selectJsonFile()
      if (!filePath) return

      const raw = await window.api.readJsonFile(filePath)
      if (!raw) {
        setImportError('Could not read file.')
        return
      }

      const result = importSkipPack(animeId, raw)
      if (!result.ok) {
        setImportError(result.error ?? 'Unknown error')
      } else {
        setImportSuccess(`Pack imported successfully.`)
      }
    } catch (err) {
      setImportError(String(err))
    }
  }

  // ── Export Skip Data ──────────────────────────────────────────────
  const handleExportSkipData = async () => {
    const entries = allEpisodesForStats
      .map((ep, i) => {
        const d = skipData?.[ep.filePath]
        if (!d || (d.introEnd == null && d.outroEnd == null)) return null
        return {
          episodeNumber: i + 1,
          episodeTitle: ep.fileName,
          introStart: d.introStart,
          introEnd: d.introEnd,
          outroStart: d.outroStart,
          outroEnd: d.outroEnd
        }
      })
      .filter(Boolean)

    if (entries.length === 0) {
      setImportError('No skip data to export.')
      return
    }

    const json = {
      name: selectedAnime.name,
      animeTitle: selectedAnime.name,
      exportedAt: new Date().toISOString(),
      entries
    }

    try {
      const saved = await window.api.saveJsonFile(json)
      if (saved) {
        setImportSuccess('Skip data exported successfully.')
      }
    } catch (err) {
      setImportError(String(err))
    }
  }

  // ── Apply skip pack to one episode ───────────────────────────────
  const handleApplyToCurrentEpisode = async () => {
    if (!selectedEpisode) {
      setApplyStatus('No episode selected.')
      return
    }
    const entry = resolveSkipForEpisode(animeId, selectedEpisode)
    if (!entry) {
      setApplyStatus('No matching entry in active pack.')
      return
    }
    const data: SkipTimestamps = {
      introStart: entry.introStart,
      introEnd: entry.introEnd,
      outroStart: entry.outroStart,
      outroEnd: entry.outroEnd
    }
    // Write directly to the target episode. We must NOT touch currentEpisode
    // here — changing it triggers App's playback effect, which closes both
    // sidebars.
    await updateSkipData(data, selectedEpisode.filePath)
    setApplyStatus(`Applied to: ${selectedEpisode.fileName}`)
  }

  // ── Apply skip pack to all episodes ──────────────────────────────
  const handleApplyToAllEpisodes = async () => {
    let count = 0

    for (const episode of allEpisodesForStats) {
      const entry = resolveSkipForEpisode(animeId, episode)
      if (!entry) continue
      const data: SkipTimestamps = {
        introStart: entry.introStart,
        introEnd: entry.introEnd,
        outroStart: entry.outroStart,
        outroEnd: entry.outroEnd
      }
      // Pass the target filePath so currentEpisode is never mutated (mutating it
      // would collapse the sidebars via App's playback effect).
      await updateSkipData(data, episode.filePath)
      count++
    }

    setApplyStatus(`Applied to ${count} episodes.`)
  }

  // ── Play selected episode ─────────────────────────────────────────
  const handlePlay = () => {
    if (!selectedEpisode) return
    playEpisode(selectedEpisode)
    setCenterMode('player')
  }

  return (
    <div className="flex-1 bg-dark-950 overflow-y-auto relative">
      <div className="relative max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          {/* Back to the full-width episode grid this panel was opened from. */}
          <button
            type="button"
            onClick={() => setCenterMode('episodes')}
            className="mb-3 inline-flex items-center gap-1.5 px-2 py-1.5 -ml-2 rounded-lg text-xs text-neutral-300 hover:bg-dark-800 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Episodes
          </button>
          {/* Same treatment as the episode grid: parents as breadcrumb, the
              opened folder as the title. */}
          <p className="text-xs text-neutral-500 truncate">{folderParents || 'Title'}</p>
          <h1 className="text-2xl font-bold text-white truncate" title={selectedAnime.name}>
            {folderTitle}
          </h1>

          {/* Location */}
          <div className="mt-8 px-3 py-2 bg-dark-800 rounded-lg flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-500">Folder</p>
              {/* Just the opened folder's own name; the full path is on hover. */}
              <p className="text-sm text-white truncate" title={openedFolderPath}>
                {openedFolderName}
              </p>
            </div>
            <button
              onClick={() => window.api.openFolder(openedFolderPath)}
              className="ml-3 shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dark-600 text-neutral-300 hover:bg-dark-700 hover:text-white transition-colors"
              title="Open folder location"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v1M2 6v12a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2H2"
                />
              </svg>
              Open Folder Location
            </button>
          </div>

          {selectedEpisode && (
            <div className="mt-2 px-3 py-2 bg-dark-800 rounded-lg flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">Selected Episode</p>
                <p className="text-sm text-white truncate">{selectedEpisode.fileName}</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePlay}
                className="ml-4 shrink-0 gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Play
              </Button>
            </div>
          )}
        </div>

        {/* Status */}
        <Section title="Status">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Total Episodes" value={totalEpisodes} />
            <Stat label="With Subtitle" value={episodesWithSubtitle} total={totalEpisodes} />
            <Stat label="With Skip Intro" value={episodesWithIntro} total={totalEpisodes} />
            <Stat label="With Skip Outro" value={episodesWithOutro} total={totalEpisodes} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-dark-800 rounded-lg px-3 py-2">
              <p className="text-xs text-neutral-500">Total Duration</p>
              <p className="text-lg font-semibold text-white">
                {isProbingDuration && totalDurationSeconds == null
                  ? 'Calculating duration...'
                  : formatWatchTime(totalDurationSeconds ?? 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-dark-800 rounded-lg px-3 py-2">
                <p className="text-xs text-neutral-500">Watched Time</p>
                <p className="text-sm font-semibold text-blue-400">
                  {formatWatchTime(watchedSeconds)}
                </p>
              </div>
              <div className="bg-dark-800 rounded-lg px-3 py-2">
                <p className="text-xs text-neutral-500">Remaining Watch Time</p>
                <p className="text-sm font-semibold text-blue-400">
                  {remainingSeconds != null
                    ? isProbingDuration
                      ? '...'
                      : formatWatchTime(remainingSeconds)
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Skip Pack */}
        <Section title="Skip Intro / Outro">
          {/* Import / Export */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleImportSkipPack}
                className="border border-dark-600 gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Import
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="border border-dark-600 gap-1.5"
                onClick={handleExportSkipData}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
                Export
              </Button>
            </div>
            {importError && <p className="text-xs text-red-400">{importError}</p>}
            {importSuccess && <p className="text-xs text-green-400">{importSuccess}</p>}
          </div>

          {/* Pack list */}
          {packs.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-neutral-500 mb-2">Imported Packs</p>
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    activePackId === pack.id
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-purple-600 bg-purple-600 text-neutral-300 hover:border-dark-600'
                  }`}
                  onClick={() => setActiveSkipPack(animeId, pack.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{pack.name}</p>
                    <p className="text-xs text-neutral-200">{pack.entries.length} entries</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSkipPack(animeId, pack.id)
                    }}
                    className="ml-2 p-1 text-white rounded transition-colors "
                    title="Remove pack"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Apply pack actions */}
          {activePackId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="border border-dark-600 gap-1.5"
                onClick={handleApplyToCurrentEpisode}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                Apply to Current Episode
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="border border-dark-600 gap-1.5"
                onClick={handleApplyToAllEpisodes}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Apply to All Episodes
              </Button>
            </div>
          )}

          {applyStatus && <p className="text-xs text-green-400 mt-1">{applyStatus}</p>}

          {/* Clear skip data */}
          <div className="mt-4 pt-4 border-t border-dark-800">
            <p className="text-xs text-neutral-500 mb-3">Clear Skip Data</p>
            <div className="flex flex-wrap gap-2">
              {selectedEpisode && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-dark-600 text-white  gap-1.5"
                  onClick={async () => {
                    if (!selectedEpisode) return
                    await clearSkipForEpisode(selectedEpisode.filePath)
                    setApplyStatus(`Cleared skip data for: ${selectedEpisode.fileName}`)
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear for Selected Episode
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="border border-dark-600 text-white bg-red-800 gap-1.5"
                onClick={async () => {
                  const filePaths = allEpisodesForStats.map((ep) => ep.filePath)
                  await clearAllSkipData(filePaths)
                  setApplyStatus('Cleared all skip data for this folder.')
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear All
              </Button>
            </div>
          </div>
        </Section>

        {/* Bottom actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handlePlay}
            disabled={!selectedEpisode}
            className="gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Play Selected Episode
          </Button>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => {
              useLibrarySettingsStore.getState().resetSettings()
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset
          </Button>
        </div>

        <p className="text-xs text-neutral-700 pb-4">
          {!selectedEpisode && 'Select an episode from the panel on the right to enable playback.'}
        </p>
      </div>
    </div>
  )
}

// ── Small helpers ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="bg-dark-900 rounded-xl p-4 space-y-3">{children}</div>
    </div>
  )
}

function Stat({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div className="bg-dark-800 rounded-lg px-3 py-2">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-semibold text-white">
        {value}
        {total != null && <span className="text-sm text-neutral-500 font-normal"> / {total}</span>}
      </p>
    </div>
  )
}
