import { useCallback, useEffect, useRef, useState } from 'react'
import type { Subtitle } from '../types/anime'
import { useSettingsStore } from '../store/settings.store'
import { useSubtitlePreferenceStore } from '../store/subtitle-preference.store'

export type SubtitleState = {
  /** Currently selected subtitle (null = Off) */
  selectedSubtitle: Subtitle | null
  /**
   * For VTT/SRT tracks: file:// URL to pass to <track src>.
   * For ASS/SSA: raw ASS script text (use AssRenderer component instead).
   */
  subtitleSrc: string
  /** Raw ASS/SSA script text when selectedSubtitle is .ass or .ssa */
  assContent: string | null
  /** Whether the current subtitle is an ASS/SSA format */
  isAssSubtitle: boolean

  setSelectedSubtitle: (subtitle: Subtitle | null) => void
  /** Cycle to the next subtitle track (T key), wraps around to Off */
  cycleSubtitle: () => void
  /** Immediately turn off subtitles (Shift+T) */
  disableSubtitle: () => void
}

export function useSubtitle(subtitles: Subtitle[] = []): SubtitleState {
  const [selectedSubtitle, setSelectedSubtitleState] = useState<Subtitle | null>(null)
  const [subtitleSrc, setSubtitleSrc] = useState<string>('')
  const [assContent, setAssContent] = useState<string | null>(null)

  const { preferredSubtitleLanguage, preferredSubtitleFormat } = useSettingsStore()
  const { resolveBestSubtitle, setLastSubtitle } = useSubtitlePreferenceStore()

  // Track the subtitles array identity to detect episode changes
  const prevSubtitlesRef = useRef<Subtitle[]>([])

  // When subtitles list changes (new episode), resolve the best track
  useEffect(() => {
    if (subtitles === prevSubtitlesRef.current) return
    prevSubtitlesRef.current = subtitles

    if (subtitles.length === 0) {
      setSelectedSubtitleState(null)
      return
    }

    const best = resolveBestSubtitle(subtitles, preferredSubtitleLanguage, preferredSubtitleFormat)
    setSelectedSubtitleState(best)
  }, [subtitles, preferredSubtitleLanguage, preferredSubtitleFormat, resolveBestSubtitle])

  // Load subtitle content whenever selection changes
  useEffect(() => {
    let cancelled = false

    async function loadSubtitle() {
      if (!selectedSubtitle) {
        setSubtitleSrc('')
        setAssContent(null)
        return
      }

      const ext = selectedSubtitle.extension.toLowerCase()

      if (ext === '.ass' || ext === '.ssa') {
        // Read raw ASS/SSA content for canvas renderer
        try {
          const content = await window.api.readSubtitleFile(selectedSubtitle.path)
          if (!cancelled) {
            setAssContent(content)
            setSubtitleSrc('')
          }
        } catch (err) {
          console.error('Failed to read ASS subtitle', err)
        }
        return
      }

      // SRT → convert to VTT first
      const filePath =
        ext === '.srt'
          ? await window.api.convertSrtToVtt(selectedSubtitle.path)
          : selectedSubtitle.path

      const url = await window.api.toFileUrl(filePath)
      if (!cancelled) {
        setSubtitleSrc(url)
        setAssContent(null)
      }
    }

    loadSubtitle().catch(console.error)
    return () => {
      cancelled = true
    }
  }, [selectedSubtitle])

  const setSelectedSubtitle = useCallback(
    (subtitle: Subtitle | null) => {
      setSelectedSubtitleState(subtitle)
      setLastSubtitle(subtitle)
    },
    [setLastSubtitle]
  )

  const cycleSubtitle = useCallback(() => {
    // Cycle: null → sub[0] → sub[1] → ... → null
    if (subtitles.length === 0) return

    if (selectedSubtitle === null) {
      setSelectedSubtitle(subtitles[0])
      return
    }

    const currentIndex = subtitles.findIndex((s) => s.path === selectedSubtitle.path)
    if (currentIndex < 0 || currentIndex >= subtitles.length - 1) {
      // Past last → turn off
      setSelectedSubtitle(null)
    } else {
      setSelectedSubtitle(subtitles[currentIndex + 1])
    }
  }, [subtitles, selectedSubtitle, setSelectedSubtitle])

  const disableSubtitle = useCallback(() => {
    setSelectedSubtitle(null)
  }, [setSelectedSubtitle])

  const isAssSubtitle =
    selectedSubtitle !== null &&
    (selectedSubtitle.extension === '.ass' || selectedSubtitle.extension === '.ssa')

  return {
    selectedSubtitle,
    subtitleSrc,
    assContent,
    isAssSubtitle,
    setSelectedSubtitle,
    cycleSubtitle,
    disableSubtitle
  }
}
