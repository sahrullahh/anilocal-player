import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  volume: number
  isMute: boolean
  defaultSubtitleExt: string
  theme: 'dark' | 'light'
  autoplay: boolean
  repeat: boolean

  setVolume: (volume: number) => void
  setIsMute: (mute: boolean) => void
  setTheme: (theme: 'dark' | 'light') => void
  setAutoplay: (autoplay: boolean) => void
  setRepeat: (repeat: boolean) => void
}5

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      volume: 1,
      isMute: false,
      defaultSubtitleExt: '.vtt',
      theme: 'dark',
      autoplay: true,
      repeat: false,

      setVolume: (volume) => set({ volume, isMute: volume === 0 }),
      setIsMute: (isMute) => set({ isMute }),
      setTheme: (theme) => set({ theme }),
      setAutoplay: (autoplay) => set({ autoplay }),
      setRepeat: (repeat) => set({ repeat })
    }),
    {
      name: 'anilocal-settings'
    }
  )
)

export type { SettingsState }
