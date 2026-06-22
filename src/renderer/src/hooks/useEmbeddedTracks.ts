/**
 * useEmbeddedTracks — Probes an MKV episode for embedded subtitle tracks
 * and maps them to Subtitle objects with `source: 'embedded'`.
 *
 * Requirements: 1.6, 3.1, 3.2
 */
import { useEffect, useState } from 'react'
import type { Episode, Subtitle } from '../types/anime'

/**
 * Format a language tag for display in the subtitle label.
 * Uses the tag as-is since it is typically already a human-readable
 * ISO 639-2 code (e.g. "eng", "jpn", "und").
 */
function formatLanguage(language: string): string {
  if (!language || language === 'und') return 'Unknown'
  // Capitalize first letter for a slightly nicer display
  return language.charAt(0).toUpperCase() + language.slice(1)
}

/**
 * Returns an array of `Subtitle` objects representing embedded ASS tracks
 * found inside the given MKV episode. Returns an empty array for non-MKV
 * files or when probing fails.
 *
 * @param currentEpisode - The currently loaded episode, or null when nothing is playing.
 */
export function useEmbeddedTracks(currentEpisode: Episode | null): Subtitle[] {
  const [embeddedSubtitles, setEmbeddedSubtitles] = useState<Subtitle[]>([])

  useEffect(() => {
    // Reset on episode change
    setEmbeddedSubtitles([])

    if (!currentEpisode) return

    // Only probe MKV files (requirement 1.6)
    const ext = currentEpisode.extension?.toLowerCase() ?? ''
    const isMkv =
      ext === '.mkv' ||
      currentEpisode.filePath.toLowerCase().endsWith('.mkv')

    if (!isMkv) return

    let cancelled = false

    async function probe() {
      if (!currentEpisode) return

      try {
        const result = await window.api.probeEmbeddedTracks(currentEpisode.filePath)

        if (cancelled) return

        // Structured error — log and fall back to no embedded tracks
        if ('error' in result) {
          console.warn('[useEmbeddedTracks] probeEmbeddedTracks failed:', result.error)
          return
        }

        const subtitles: Subtitle[] = result.map((track) => ({
          label: `${formatLanguage(track.language)} (Embedded ASS)`,
          path: `embedded:${track.index}`,
          extension: '.ass',
          language: formatLanguage(track.language),
          format: '.ass',
          source: 'embedded' as const,
          trackIndex: track.index
        }))

        if (!cancelled) {
          setEmbeddedSubtitles(subtitles)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[useEmbeddedTracks] Unexpected error during probing:', err)
        }
      }
    }

    void probe()

    return () => {
      cancelled = true
    }
  }, [currentEpisode])

  return embeddedSubtitles
}
