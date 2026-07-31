import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Anime } from '../types/anime'

interface LibraryState {
  libraries: Anime[]
  currentAnime: Anime | null
  isLoading: boolean

  // Actions
  loadLibrary: () => Promise<void>
  addFolder: () => Promise<void>
  reorderLibrary: (fromIndex: number, toIndex: number) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  removeLibrary: (id: string) => Promise<void>
  setCurrentAnime: (anime: Anime | null) => void
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  libraries: [],
  currentAnime: null,
  isLoading: false,

  loadLibrary: async () => {
    set({ isLoading: true })
    try {
      const data = await window.api.getLibrary()
      if (data && data.libraries) {
        const libraries = (data.libraries as any[]).map((anime: any) => ({
          ...anime,
          // Absent on entries saved before favorites existed.
          favorite: anime.favorite ?? false,
          episodes: (anime.episodes ?? []).map((ep: any) => ({
            ...ep,
            fansubInfo: ep.fansubInfo ?? { fansubGroup: null, animeTitle: null, episode: null },
            subtitles: (ep.subtitles ?? []).map((s: any) => ({
              label: s.label ?? s.path,
              path: s.path,
              extension: s.extension ?? '',
              language: s.language ?? 'Unknown',
              format: s.format ?? s.extension ?? '',
              source: (s.source ?? 'external') as 'internal' | 'external'
            }))
          }))
        }))
        set({ libraries })
      }
    } catch (error) {
      console.error('Failed to load library:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  addFolder: async () => {
    try {
      const folderPath = await window.api.selectFolder()
      if (!folderPath) return

      set({ isLoading: true })
      const scanResult = await window.api.scanFolder(folderPath)

      const newAnime: Anime = {
        id: uuidv4(),
        name: scanResult.name,
        path: scanResult.path,
        episodes: scanResult.episodes.map((ep) => ({
          ...ep,
          // Ensure fansubInfo always exists with defaults for old/legacy data
          fansubInfo: ep.fansubInfo ?? { fansubGroup: null, animeTitle: null, episode: null },
          subtitles: (ep.subtitles ?? []).map((s: any) => ({
            label: s.label ?? s.path,
            path: s.path,
            extension: s.extension ?? '',
            language: s.language ?? 'Unknown',
            format: s.format ?? s.extension ?? '',
            source: (s.source ?? 'external') as 'internal' | 'external'
          }))
        }))
      }

      const { libraries } = get()
      const updatedLibraries = [...libraries, newAnime]

      await window.api.saveLibrary(updatedLibraries)
      set({ libraries: updatedLibraries, currentAnime: newAnime })
    } catch (error) {
      console.error('Failed to add folder:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  reorderLibrary: async (fromIndex: number, toIndex: number) => {
    const { libraries } = get()
    if (fromIndex === toIndex) return
    const updated = [...libraries]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    await window.api.saveLibrary(updated)
    set({ libraries: updated })
  },

  toggleFavorite: async (id: string) => {
    try {
      const { libraries, currentAnime } = get()
      const updated = libraries.map((lib) =>
        lib.id === id ? { ...lib, favorite: !lib.favorite } : lib
      )

      // Persisted on the library record itself, so it rides along with the
      // existing saveLibrary channel — no new storage file or IPC needed.
      await window.api.saveLibrary(updated)

      const changed = updated.find((lib) => lib.id === id)
      set({
        libraries: updated,
        // Keep the scoped currentAnime in step when it is the same entry.
        currentAnime:
          currentAnime?.id === id && changed
            ? { ...currentAnime, favorite: changed.favorite }
            : currentAnime
      })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  },

  removeLibrary: async (id: string) => {
    try {
      const { libraries, currentAnime } = get()
      const updatedLibraries = libraries.filter((lib) => lib.id !== id)

      await window.api.saveLibrary(updatedLibraries)

      set({
        libraries: updatedLibraries,
        currentAnime: currentAnime?.id === id ? null : currentAnime
      })
    } catch (error) {
      console.error('Failed to remove library:', error)
    }
  },

  setCurrentAnime: (anime) => set({ currentAnime: anime })
}))
