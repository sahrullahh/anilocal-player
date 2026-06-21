import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  volume: number
  isMute: boolean
  defaultSubtitleExt: string
  theme: 'dark' | 'light'
  autoplay: boolean
  repeat: boolean
  /** Preferred subtitle language, e.g. "Indonesia", "English" */
  preferredSubtitleLanguage: string
  /** Preferred subtitle format extension, e.g. ".ass", ".srt" */
  preferredSubtitleFormat: string

  setVolume: (volume: number) => void
  setIsMute: (mute: boolean) => void
  setTheme: (theme: 'dark' | 'light') => void
  setAutoplay: (autoplay: boolean) => void
  setRepeat: (repeat: boolean) => void
  setPreferredSubtitleLanguage: (language: string) => void
  setPreferredSubtitleFormat: (format: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      volume: 1,
      isMute: false,
      defaultSubtitleExt: '.ass',
      theme: 'dark',
      autoplay: true,
      repeat: false,
      preferredSubtitleLanguage: 'Indonesia',
      preferredSubtitleFormat: '.ass',

      setVolume: (volume) => set({ volume, isMute: volume === 0 }),
      setIsMute: (isMute) => set({ isMute }),
      setTheme: (theme) => set({ theme }),
      setAutoplay: (autoplay) => set({ autoplay }),
      setRepeat: (repeat) => set({ repeat }),
      setPreferredSubtitleLanguage: (preferredSubtitleLanguage) =>
        set({ preferredSubtitleLanguage }),
      setPreferredSubtitleFormat: (preferredSubtitleFormat) => set({ preferredSubtitleFormat })
    }),
    {
      name: 'anilocal-settings'
    }
  )
)

export type { SettingsState }
