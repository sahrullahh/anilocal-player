import { create } from 'zustand'
import type { Episode, ProgressData, SkipTimestamps } from '../types/anime'

interface PlayerState {
  currentEpisode: Episode | null
  playlist: Episode[]
  isPlaying: boolean
  isAutoplayDelay: boolean

  progressData: Record<string, ProgressData>
  skipData: Record<string, SkipTimestamps>

  // Actions
  loadSavedData: () => Promise<void>
  setPlaylist: (episodes: Episode[]) => void
  playEpisode: (episode: Episode) => void
  playNext: () => void
  playPrevious: () => void

  // Progress & Skip
  updateProgress: (currentTime: number, duration: number) => Promise<void>
  updateSkipData: (data: SkipTimestamps) => Promise<void>

  // Control
  setIsPlaying: (playing: boolean) => void
  setAutoplayDelay: (delay: boolean) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentEpisode: null,
  playlist: [],
  isPlaying: false,
  isAutoplayDelay: false,
  progressData: {},
  skipData: {},
  autoplay: true,

  loadSavedData: async () => {
    try {
      const pData = await window.api.getProgress()
      const sData = await window.api.getSkipData()
      set({ progressData: pData, skipData: sData })
    } catch (error) {
      console.error('Failed to load saved playback data', error)
    }
  },

  setPlaylist: (episodes) => set({ playlist: episodes }),

  playEpisode: (episode) => {
    set({
      currentEpisode: episode,
      isPlaying: true,
      isAutoplayDelay: false
    })
  },

  playNext: () => {
    const { currentEpisode, playlist } = get()
    if (!currentEpisode || playlist.length === 0) return

    const currentIndex = playlist.findIndex((ep) => ep.id === currentEpisode.id)
    if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
      get().playEpisode(playlist[currentIndex + 1])
    }
  },

  playPrevious: () => {
    const { currentEpisode, playlist } = get()
    if (!currentEpisode || playlist.length === 0) return

    const currentIndex = playlist.findIndex((ep) => ep.id === currentEpisode.id)
    if (currentIndex > 0) {
      get().playEpisode(playlist[currentIndex - 1])
    }
  },

  updateProgress: async (currentTime, duration) => {
    const { currentEpisode } = get()
    if (!currentEpisode) return

    const watched = duration > 0 ? currentTime / duration > 0.9 : false

    const progress: ProgressData = {
      currentTime,
      duration,
      watched,
      updatedAt: new Date().toISOString()
    }

    const newProgressData = { [currentEpisode.filePath]: progress }

    set((state) => ({
      progressData: { ...state.progressData, ...newProgressData }
    }))

    window.api.saveProgress(newProgressData).catch(console.error)
  },

  updateSkipData: async (data) => {
    const { currentEpisode } = get()
    if (!currentEpisode) return

    const newSkipData = { [currentEpisode.filePath]: data }

    set((state) => ({
      skipData: { ...state.skipData, ...newSkipData }
    }))

    window.api.saveSkipData(newSkipData).catch(console.error)
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setAutoplayDelay: (delay) => set({ isAutoplayDelay: delay })
}))
