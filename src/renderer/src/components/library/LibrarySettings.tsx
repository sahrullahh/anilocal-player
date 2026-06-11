import { useState } from 'react'
import { useLibrarySettingsStore } from '../../store/library-settings.store'
import { usePlayerStore } from '../../store/player.store'
import { Button } from '../common/Button'
import { formatTime, parseTime } from '../../utils/time'
import type { SkipTimestamps } from '../../types/anime'

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

  const { skipData, updateSkipData, playEpisode } = usePlayerStore()

  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)

  // Manual skip edit state (for selected episode)
  const [manualSkip, setManualSkip] = useState<SkipTimestamps>(() => {
    if (selectedEpisode) return skipData?.[selectedEpisode.filePath] ?? {}
    return {}
  })

  if (!selectedAnime) return null

  const animeId = selectedAnime.id
  const packs = skipPacks[animeId] ?? []
  const activePackId = activeSkipPackId[animeId] ?? null

  // Stats
  const totalEpisodes = selectedAnime.episodes.length
  const episodesWithSubtitle = selectedAnime.episodes.filter(
    (ep) => ep.subtitles && ep.subtitles.length > 0
  ).length
  const episodesWithIntro = selectedAnime.episodes.filter((ep) => {
    const d = skipData?.[ep.filePath]
    return d?.introEnd != null
  }).length
  const episodesWithOutro = selectedAnime.episodes.filter((ep) => {
    const d = skipData?.[ep.filePath]
    return d?.outroEnd != null
  }).length

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
    // Temporarily set as current episode so updateSkipData works
    const prevEpisode = usePlayerStore.getState().currentEpisode
    usePlayerStore.setState({ currentEpisode: selectedEpisode })
    await updateSkipData(data)
    usePlayerStore.setState({ currentEpisode: prevEpisode })
    setApplyStatus(`Applied to: ${selectedEpisode.fileName}`)
  }

  // ── Apply skip pack to all episodes ──────────────────────────────
  const handleApplyToAllEpisodes = async () => {
    let count = 0
    const prevEpisode = usePlayerStore.getState().currentEpisode

    for (const episode of selectedAnime.episodes) {
      const entry = resolveSkipForEpisode(animeId, episode)
      if (!entry) continue
      const data: SkipTimestamps = {
        introStart: entry.introStart,
        introEnd: entry.introEnd,
        outroStart: entry.outroStart,
        outroEnd: entry.outroEnd
      }
      usePlayerStore.setState({ currentEpisode: episode })
      await updateSkipData(data)
      count++
    }

    usePlayerStore.setState({ currentEpisode: prevEpisode })
    setApplyStatus(`Applied to ${count} episodes.`)
  }

  // ── Save manual skip for selected episode ────────────────────────
  const handleSaveManualSkip = async () => {
    if (!selectedEpisode) return
    const prevEpisode = usePlayerStore.getState().currentEpisode
    usePlayerStore.setState({ currentEpisode: selectedEpisode })
    await updateSkipData(manualSkip)
    usePlayerStore.setState({ currentEpisode: prevEpisode })
    setApplyStatus(`Skip data saved for: ${selectedEpisode.fileName}`)
  }

  // ── Play selected episode ─────────────────────────────────────────
  const handlePlay = () => {
    if (!selectedEpisode) return
    playEpisode(selectedEpisode)
    setCenterMode('player')
  }

  // ── Input field helper ───────────────────────────────────────────
  const TimeInput = ({
    label,
    value,
    onChange
  }: {
    label: string
    value: number | undefined
    onChange: (v: number | undefined) => void
  }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        placeholder="0:00"
        value={value != null ? formatTime(value) : ''}
        onChange={(e) => onChange(e.target.value ? parseTime(e.target.value) : undefined)}
        className="w-full px-2 py-1.5 bg-dark-800 border border-dark-700 rounded text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div className="flex-1 bg-dark-950 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white truncate">{selectedAnime.name}</h1>
          <p className="text-sm text-gray-500 mt-1 truncate">{selectedAnime.path}</p>
          {selectedEpisode && (
            <div className="mt-2 px-3 py-2 bg-dark-800 rounded-lg flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Selected Episode</p>
                <p className="text-sm text-white truncate">{selectedEpisode.fileName}</p>
              </div>
              <Button variant="primary" size="sm" onClick={handlePlay} className="ml-4 shrink-0">
                ▶ Play
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
        </Section>

        {/* Skip Pack */}
        <Section title="Skip Intro / Outro">
          {/* Import */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleImportSkipPack} className="border border-dark-600">
                Import Skip Pack (.json)
              </Button>
            </div>
            {importError && <p className="text-xs text-red-400">{importError}</p>}
            {importSuccess && <p className="text-xs text-green-400">{importSuccess}</p>}
          </div>

          {/* Pack list */}
          {packs.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500 mb-2">Imported Packs</p>
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    activePackId === pack.id
                      ? 'border-blue-600 bg-blue-600/10 text-blue-300'
                      : 'border-dark-700 bg-dark-800 text-gray-300 hover:border-dark-600'
                  }`}
                  onClick={() => setActiveSkipPack(animeId, pack.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pack.name}</p>
                    <p className="text-xs text-gray-500">{pack.entries.length} entries</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSkipPack(animeId, pack.id)
                    }}
                    className="ml-2 p-1 hover:bg-red-600/20 hover:text-red-400 rounded transition-colors text-gray-600"
                    title="Remove pack"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Apply pack actions */}
          {activePackId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" className="border border-dark-600" onClick={handleApplyToCurrentEpisode}>
                Apply to Current Episode
              </Button>
              <Button size="sm" variant="ghost" className="border border-dark-600" onClick={handleApplyToAllEpisodes}>
                Apply to All Episodes
              </Button>
            </div>
          )}

          {applyStatus && (
            <p className="text-xs text-green-400 mt-1">{applyStatus}</p>
          )}

          {/* Manual edit */}
          <div className="mt-4 pt-4 border-t border-dark-800">
            <p className="text-xs text-gray-500 mb-3">
              Manual Edit{selectedEpisode ? ` — ${selectedEpisode.fileName}` : ' (select an episode first)'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TimeInput
                label="Intro Start"
                value={manualSkip.introStart}
                onChange={(v) => setManualSkip((s) => ({ ...s, introStart: v }))}
              />
              <TimeInput
                label="Intro End"
                value={manualSkip.introEnd}
                onChange={(v) => setManualSkip((s) => ({ ...s, introEnd: v }))}
              />
              <TimeInput
                label="Outro Start"
                value={manualSkip.outroStart}
                onChange={(v) => setManualSkip((s) => ({ ...s, outroStart: v }))}
              />
              <TimeInput
                label="Outro End"
                value={manualSkip.outroEnd}
                onChange={(v) => setManualSkip((s) => ({ ...s, outroEnd: v }))}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="ghost"
                className="border border-dark-600"
                onClick={handleSaveManualSkip}
                disabled={!selectedEpisode}
              >
                Save Skip Data
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="border border-dark-600 text-gray-500"
                onClick={() => setManualSkip({})}
              >
                Clear
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
          >
            ▶ Play Selected Episode
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              useLibrarySettingsStore.getState().resetSettings()
            }}
          >
            Reset
          </Button>
        </div>

        <p className="text-xs text-gray-700 pb-4">
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
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      <div className="bg-dark-900 rounded-xl p-4 space-y-3">{children}</div>
    </div>
  )
}

function Stat({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div className="bg-dark-800 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-white">
        {value}
        {total != null && <span className="text-sm text-gray-500 font-normal"> / {total}</span>}
      </p>
    </div>
  )
}
