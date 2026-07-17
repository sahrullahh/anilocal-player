import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type KeybindAction =
  | 'togglePlay'
  | 'seekForward'
  | 'seekBackward'
  | 'toggleFullscreen'
  | 'toggleMute'
  | 'nextEpisode'
  | 'skipIntroOutro'
  | 'cycleSubtitle'
  | 'disableSubtitle'
  | 'toggleLibrary'
  | 'toggleEpisodes'

export type Keybind = { key: string; ctrl: boolean; shift: boolean; alt: boolean }

const DEFAULT_KEYBINDS: Record<KeybindAction, Keybind> = {
  togglePlay:      { key: ' ', ctrl: false, shift: false, alt: false },
  seekForward:     { key: 'ArrowRight', ctrl: false, shift: false, alt: false },
  seekBackward:    { key: 'ArrowLeft', ctrl: false, shift: false, alt: false },
  toggleFullscreen:{ key: 'f', ctrl: false, shift: false, alt: false },
  toggleMute:      { key: 'm', ctrl: false, shift: false, alt: false },
  nextEpisode:     { key: 'n', ctrl: false, shift: false, alt: false },
  skipIntroOutro:  { key: 's', ctrl: false, shift: false, alt: false },
  cycleSubtitle:   { key: 't', ctrl: false, shift: false, alt: false },
  disableSubtitle: { key: 't', ctrl: false, shift: true, alt: false },
  toggleLibrary:   { key: 'b', ctrl: true, shift: false, alt: false },
  toggleEpisodes:  { key: 'b', ctrl: true, shift: false, alt: true }
}

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  togglePlay:       'Play / Pause',
  seekForward:      'Seek Forward 10s',
  seekBackward:     'Seek Backward 10s',
  toggleFullscreen: 'Toggle Fullscreen',
  toggleMute:       'Mute / Unmute',
  nextEpisode:      'Next Episode',
  skipIntroOutro:   'Skip Intro / Outro',
  cycleSubtitle:    'Cycle Subtitle',
  disableSubtitle:  'Disable Subtitle',
  toggleLibrary:    'Toggle Library',
  toggleEpisodes:   'Toggle Episodes'
}

interface SettingsState {
  volume: number
  isMute: boolean
  defaultSubtitleExt: string
  theme: 'slate' | 'neutral' | 'light'
  autoplay: boolean
  repeat: boolean
  autoSkipIntroOutro: boolean
  preferredSubtitleLanguage: string
  preferredSubtitleFormat: string
  keybinds: Record<KeybindAction, Keybind>

  setVolume: (volume: number) => void
  setIsMute: (mute: boolean) => void
  setTheme: (theme: 'slate' | 'neutral' | 'light') => void
  setAutoplay: (autoplay: boolean) => void
  setRepeat: (repeat: boolean) => void
  setAutoSkipIntroOutro: (autoSkipIntroOutro: boolean) => void
  setPreferredSubtitleLanguage: (language: string) => void
  setPreferredSubtitleFormat: (format: string) => void
  setKeybind: (action: KeybindAction, keybind: Keybind) => void
  resetAllKeybinds: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      volume: 1,
      isMute: false,
      defaultSubtitleExt: '.ass',
      theme: 'slate',
      autoplay: true,
      repeat: false,
      // Default OFF on fresh install; user must explicitly opt in.
      autoSkipIntroOutro: false,
      preferredSubtitleLanguage: 'Indonesia',
      preferredSubtitleFormat: '.ass',
      keybinds: { ...DEFAULT_KEYBINDS },

      setVolume: (volume) => set({ volume, isMute: volume === 0 }),
      setIsMute: (isMute) => set({ isMute }),
      setTheme: (theme) => set({ theme }),
      setAutoplay: (autoplay) => set({ autoplay }),
      setRepeat: (repeat) => set({ repeat }),
      setAutoSkipIntroOutro: (autoSkipIntroOutro) => set({ autoSkipIntroOutro }),
      setPreferredSubtitleLanguage: (preferredSubtitleLanguage) =>
        set({ preferredSubtitleLanguage }),
      setPreferredSubtitleFormat: (preferredSubtitleFormat) => set({ preferredSubtitleFormat }),
      setKeybind: (action, keybind) =>
        set((s) => ({ keybinds: { ...s.keybinds, [action]: keybind } })),
      resetAllKeybinds: () => set({ keybinds: { ...DEFAULT_KEYBINDS } })
    }),
    {
      name: 'anilocal-settings',
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>
        return {
          ...current,
          ...saved,
          keybinds: { ...DEFAULT_KEYBINDS, ...(saved.keybinds ?? {}) }
        }
      }
    }
  )
)

export type { SettingsState }
