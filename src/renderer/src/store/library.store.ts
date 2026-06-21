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
