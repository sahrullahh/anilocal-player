import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Anime, Episode, SkipPack, SkipPackEntry, EpisodeMappings } from '../types/anime'

/**
 * Possible "center area" modes:
 * - 'landing'          : default startup screen
 * - 'library-settings' : anime selected, showing settings before playing
 * - 'player'           : video is actively playing
 */
export type CenterMode = 'landing' | 'library-settings' | 'player'

interface LibrarySettingsState {
  centerMode: CenterMode
  selectedAnime: Anime | null
  selectedEpisode: Episode | null

  // Skip packs stored per animeId
  skipPacks: Record<string, SkipPack[]>
  activeSkipPackId: Record<string, string | null>

  // Episode number mapping per anime: filePath -> episodeNumber
  episodeMappings: Record<string, EpisodeMappings>

  // Actions
  setCenterMode: (mode: CenterMode) => void
  selectAnime: (anime: Anime) => void
  selectEpisode: (episode: Episode) => void
  resetSettings: () => void

  importSkipPack: (animeId: string, raw: unknown) => { ok: boolean; error?: string }
  setActiveSkipPack: (animeId: string, packId: string | null) => void
  removeSkipPack: (animeId: string, packId: string) => void

  getActivePackEntries: (animeId: string) => SkipPackEntry[]
  resolveSkipForEpisode: (animeId: string, episode: Episode) => SkipPackEntry | null

  setEpisodeMapping: (animeId: string, filePath: string, epNum: number) => void
}

export const useLibrarySettingsStore = create<LibrarySettingsState>((set, get) => ({
  centerMode: 'landing',
  selectedAnime: null,
  selectedEpisode: null,
  skipPacks: {},
  activeSkipPackId: {},
  episodeMappings: {},

  setCenterMode: (mode) => set({ centerMode: mode }),

  selectAnime: (anime) =>
    set({
      selectedAnime: anime,
      selectedEpisode: null,
      centerMode: 'library-settings'
    }),

  selectEpisode: (episode) => set({ selectedEpisode: episode }),

  resetSettings: () =>
    set({
      centerMode: 'landing',
      selectedAnime: null,
      selectedEpisode: null
    }),

  importSkipPack: (animeId, raw) => {
    if (!raw) {
      return { ok: false, error: 'Empty file.' }
    }

    // Normalize: support array at root or various wrapper keys
    let rawEntries: unknown[] | null = null
    let packName = 'Imported Pack'
    let packAnimeTitle: string | undefined

    if (Array.isArray(raw)) {
      // Format: [ { episodeNumber, introStart, ... }, ... ]
      rawEntries = raw
    } else if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      packName = (obj.name as string) || (obj.title as string) || packName
      packAnimeTitle = (obj.animeTitle as string) || (obj.anime as string) || undefined

      // Try common wrapper keys
      for (const key of ['entries', 'episodes', 'skips', 'data', 'timestamps']) {
        if (Array.isArray(obj[key])) {
          rawEntries = obj[key] as unknown[]
          break
        }
      }

      // Last resort: if the object itself has episodeNumber, wrap it
      if (!rawEntries && 'episodeNumber' in obj) {
        rawEntries = [obj]
      }
    }

    if (!rawEntries) {
      return {
        ok: false,
        error:
          'Unrecognized format. Expected an array or an object with "entries", "episodes", "skips", or "data" key.'
      }
    }

    if (rawEntries.length === 0) {
      return { ok: false, error: 'Pack is empty — no entries found.' }
    }

    const entries: SkipPackEntry[] = rawEntries.map((e: unknown, idx) => {
      if (typeof e !== 'object' || !e) return { episodeNumber: idx + 1 }
      const entry = e as Record<string, unknown>

      // Support nested skip object: { skip: { intro: { start, end }, outro: { start, end } } }
      const skipObj = entry.skip as Record<string, unknown> | undefined
      const introObj = skipObj?.intro as Record<string, unknown> | null | undefined
      const outroObj = skipObj?.outro as Record<string, unknown> | null | undefined

      return {
        episodeNumber: Number(
          entry.episodeNumber ??
            entry.episode ??
            entry.ep ??
            entry.number ??
            idx + 1
        ),
        episodeTitle:
          (entry.episodeTitle as string | undefined) ||
          (entry.fileName as string | undefined) ||
          (entry.title as string | undefined),
        // Nested format: skip.intro.start / skip.intro.end
        introStart:
          introObj?.start != null
            ? Number(introObj.start)
            : entry.introStart != null
              ? Number(entry.introStart)
              : entry.intro_start != null
                ? Number(entry.intro_start)
                : undefined,
        introEnd:
          introObj?.end != null
            ? Number(introObj.end)
            : entry.introEnd != null
              ? Number(entry.introEnd)
              : entry.intro_end != null
                ? Number(entry.intro_end)
                : undefined,
        outroStart:
          outroObj?.start != null
            ? Number(outroObj.start)
            : entry.outroStart != null
              ? Number(entry.outroStart)
              : entry.outro_start != null
                ? Number(entry.outro_start)
                : undefined,
        outroEnd:
          outroObj?.end != null
            ? Number(outroObj.end)
            : entry.outroEnd != null
              ? Number(entry.outroEnd)
              : entry.outro_end != null
                ? Number(entry.outro_end)
                : undefined
      }
    })

    const pack: SkipPack = {
      id: uuidv4(),
      name: packName,
      animeTitle: packAnimeTitle,
      importedAt: new Date().toISOString(),
      entries
    }

    set((state) => ({
      skipPacks: {
        ...state.skipPacks,
        [animeId]: [...(state.skipPacks[animeId] ?? []), pack]
      },
      // Auto-activate on first import
      activeSkipPackId: {
        ...state.activeSkipPackId,
        [animeId]: state.activeSkipPackId[animeId] ?? pack.id
      }
    }))

    return { ok: true }
  },

  setActiveSkipPack: (animeId, packId) =>
    set((state) => ({
      activeSkipPackId: { ...state.activeSkipPackId, [animeId]: packId }
    })),

  removeSkipPack: (animeId, packId) =>
    set((state) => {
      const updated = (state.skipPacks[animeId] ?? []).filter((p) => p.id !== packId)
      const activeId = state.activeSkipPackId[animeId]
      return {
        skipPacks: { ...state.skipPacks, [animeId]: updated },
        activeSkipPackId: {
          ...state.activeSkipPackId,
          [animeId]: activeId === packId ? null : activeId
        }
      }
    }),

  getActivePackEntries: (animeId) => {
    const { skipPacks, activeSkipPackId } = get()
    const packId = activeSkipPackId[animeId]
    if (!packId) return []
    const pack = (skipPacks[animeId] ?? []).find((p) => p.id === packId)
    return pack?.entries ?? []
  },

  resolveSkipForEpisode: (animeId, episode) => {
    const entries = get().getActivePackEntries(animeId)
    if (!entries.length) return null

    const mappings = get().episodeMappings[animeId] ?? {}
    const epNum = mappings[episode.filePath]

    if (epNum != null) {
      const found = entries.find((e) => e.episodeNumber === epNum)
      if (found) return found
    }

    // Fallback: match by position in the playlist
    const { selectedAnime } = get()
    if (!selectedAnime) return null
    const idx = selectedAnime.episodes.findIndex((e) => e.filePath === episode.filePath)
    if (idx >= 0 && idx < entries.length) return entries[idx]

    return null
  },

  setEpisodeMapping: (animeId, filePath, epNum) =>
    set((state) => ({
      episodeMappings: {
        ...state.episodeMappings,
        [animeId]: { ...(state.episodeMappings[animeId] ?? {}), [filePath]: epNum }
      }
    }))
}))
