/**
 * Stores the user's last-chosen subtitle track label so it can be
 * automatically restored on the next episode.
 *
 * The key is a "preference key" = `${language}::${format}`, e.g. "Indonesia::.ass"
 * We persist so it survives app restarts.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Subtitle } from '../types/anime'
import { SUBTITLE_FORMAT_PRIORITY } from '../types/anime'

interface SubtitlePreferenceState {
  /** Last selected subtitle preference key (language::format) or null = Off */
  lastPreferenceKey: string | null

  setLastSubtitle: (subtitle: Subtitle | null) => void

  /**
   * Pick the best subtitle from a list, respecting:
   * 1. The user's last pick (if a matching track exists)
   * 2. The user's preferred language + format from settings
   * 3. Format priority (ASS > SSA > SRT > VTT)
   * 4. First available
   */
  resolveBestSubtitle: (
    subtitles: Subtitle[],
    preferredLanguage: string,
    preferredFormat: string
  ) => Subtitle | null
}

export function makePreferenceKey(subtitle: Subtitle): string {
  return `${subtitle.language}::${subtitle.format}`
}

export const useSubtitlePreferenceStore = create<SubtitlePreferenceState>()(
  persist(
    (set, get) => ({
      lastPreferenceKey: null,

      setLastSubtitle: (subtitle) => {
        set({ lastPreferenceKey: subtitle ? makePreferenceKey(subtitle) : null })
      },

      resolveBestSubtitle: (subtitles, preferredLanguage, preferredFormat) => {
        if (subtitles.length === 0) return null

        const { lastPreferenceKey } = get()

        // 1. Restore last preference
        if (lastPreferenceKey) {
          const match = subtitles.find((s) => makePreferenceKey(s) === lastPreferenceKey)
          if (match) return match
        }

        // 2. Match preferred language + preferred format
        const bestMatch = subtitles.find(
          (s) =>
            s.language.toLowerCase() === preferredLanguage.toLowerCase() &&
            s.format === preferredFormat
        )
        if (bestMatch) return bestMatch

        // 3. Match preferred language (any format, sort by format priority)
        const langMatches = subtitles.filter(
          (s) => s.language.toLowerCase() === preferredLanguage.toLowerCase()
        )
        if (langMatches.length > 0) {
          return langMatches.sort(
            (a, b) =>
              (SUBTITLE_FORMAT_PRIORITY[a.format] ?? 99) -
              (SUBTITLE_FORMAT_PRIORITY[b.format] ?? 99)
          )[0]
        }

        // 4. Any subtitle sorted by format priority
        return [...subtitles].sort(
          (a, b) =>
            (SUBTITLE_FORMAT_PRIORITY[a.format] ?? 99) -
            (SUBTITLE_FORMAT_PRIORITY[b.format] ?? 99)
        )[0]
      }
    }),
    { name: 'anilocal-subtitle-preference' }
  )
)
