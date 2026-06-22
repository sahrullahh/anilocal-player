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
  /** file:// URLs for embedded font attachments extracted from the MKV; empty for non-embedded tracks */
  fontUrls: string[]

  setSelectedSubtitle: (subtitle: Subtitle | null) => void
  /** Cycle to the next subtitle track (T key), wraps around to Off */
  cycleSubtitle: () => void
  /** Immediately turn off subtitles (Shift+T) */
  disableSubtitle: () => void
}

export function useSubtitle(subtitles: Subtitle[] = [], videoPath?: string): SubtitleState {
  const [selectedSubtitle, setSelectedSubtitleState] = useState<Subtitle | null>(null)
  const [subtitleSrc, setSubtitleSrc] = useState<string>('')
  const [assContent, setAssContent] = useState<string | null>(null)
  const [fontUrls, setFontUrls] = useState<string[]>([])

  const { preferredSubtitleLanguage, preferredSubtitleFormat } = useSettingsStore()
  const { resolveBestSubtitle, setLastSubtitle } = useSubtitlePreferenceStore()

  // Track the subtitles array identity to detect episode changes
  const prevSubtitlesRef = useRef<Subtitle[]>([])
  // Mirror of selectedSubtitle in a ref so effects can read it without deps
  const selectedSubtitleRef = useRef<Subtitle | null>(null)
  selectedSubtitleRef.current = selectedSubtitle

  // When subtitles list changes (new episode), resolve the best track
  useEffect(() => {
    if (subtitles === prevSubtitlesRef.current) return
    const prevSubtitles = prevSubtitlesRef.current
    prevSubtitlesRef.current = subtitles

    if (subtitles.length === 0) {
      setSelectedSubtitleState(null)
      return
    }

    // If a subtitle is already selected and it's still in the new list,
    // keep the current selection. This prevents embedded tracks arriving
    // async from resetting a subtitle the user (or auto-select) already chose.
    // Only do this check when we're adding to an existing non-empty list
    // (i.e. embedded tracks arriving after initial selection).
    if (prevSubtitles.length > 0) {
      const current = selectedSubtitleRef.current
      if (current !== null) {
        const stillPresent = subtitles.some((s) =>
          s.source === 'embedded'
            ? s.trackIndex === current.trackIndex && current.source === 'embedded'
            : s.path === current.path
        )
        if (stillPresent) return
      }
    }

    const best = resolveBestSubtitle(subtitles, preferredSubtitleLanguage, preferredSubtitleFormat)
    setSelectedSubtitleState(best)
  }, [subtitles, preferredSubtitleLanguage, preferredSubtitleFormat, resolveBestSubtitle])

  // Track blob URLs created for font files so we can revoke them on cleanup
  const fontBlobUrlsRef = useRef<string[]>([])

  // Load subtitle content whenever selection changes
  useEffect(() => {
    let cancelled = false
    // Revoke any previously created blob URLs
    const prevBlobUrls = fontBlobUrlsRef.current
    fontBlobUrlsRef.current = []

    async function loadSubtitle() {
      if (!selectedSubtitle) {
        setSubtitleSrc('')
        setAssContent(null)
        setFontUrls([])
        return
      }

      const ext = selectedSubtitle.extension.toLowerCase()

      // ── Embedded track: extract via IPC, load fonts simultaneously ────────
      if (selectedSubtitle.source === 'embedded') {
        const trackIndex = selectedSubtitle.trackIndex ?? 0
        const effectiveVideoPath = videoPath ?? ''

        // Kick off font extraction in parallel with track extraction
        const [trackResult, fontsResult] = await Promise.all([
          window.api.extractEmbeddedTrack(effectiveVideoPath, trackIndex),
          window.api.extractFonts(effectiveVideoPath)
        ])

        if (cancelled) return

        if ('error' in trackResult) {
          console.error('Failed to extract embedded subtitle track:', trackResult.error)
          setAssContent(null)
          setSubtitleSrc('')
          setFontUrls([])
          return
        }

        // Convert font paths to Blob URLs so the Web Worker can fetch them.
        // Workers cannot fetch file:// URLs from an HTTP origin (dev server),
        // but blob: URLs are always same-origin and fetchable.
        let resolvedFontUrls: string[] = []
        if (!('error' in fontsResult) && fontsResult.paths.length > 0) {
          const blobUrls = await Promise.all(
            fontsResult.paths.map(async (fontPath) => {
              try {
                const result = await window.api.readFontFile(fontPath)
                if ('error' in result) {
                  console.warn('Failed to read font file:', fontPath, result.error)
                  return null
                }
                // result is a Buffer (Uint8Array-like) transferred via IPC
                const blob = new Blob([result as unknown as ArrayBuffer], { type: 'font/ttf' })
                return URL.createObjectURL(blob)
              } catch {
                return null
              }
            })
          )
          resolvedFontUrls = blobUrls.filter((u): u is string => u !== null)
          fontBlobUrlsRef.current = resolvedFontUrls
        }

        if (cancelled) return

        try {
          const content = await window.api.readSubtitleFile(trackResult.path)
          if (!cancelled) {
            // Set assContent and fontUrls together so they arrive in the same
            // React render batch, preventing a race where the SubtitleOctopus
            // instance is created before fontUrls are populated.
            setFontUrls(resolvedFontUrls)
            setAssContent(content)
            setSubtitleSrc('')
          }
        } catch (err) {
          console.error('Failed to read extracted ASS subtitle', err)
        }
        return
      }

      // ── ASS/SSA from file ─────────────────────────────────────────────────
      if (ext === '.ass' || ext === '.ssa') {
        // Read raw ASS/SSA content for canvas renderer
        try {
          const content = await window.api.readSubtitleFile(selectedSubtitle.path)
          if (!cancelled) {
            setAssContent(content)
            setSubtitleSrc('')
            setFontUrls([])
          }
        } catch (err) {
          console.error('Failed to read ASS subtitle', err)
        }
        return
      }

      // ── SRT / VTT ─────────────────────────────────────────────────────────
      // SRT → convert to VTT first
      const filePath =
        ext === '.srt'
          ? await window.api.convertSrtToVtt(selectedSubtitle.path)
          : selectedSubtitle.path

      const url = await window.api.toFileUrl(filePath)
      if (!cancelled) {
        setSubtitleSrc(url)
        setAssContent(null)
        setFontUrls([])
      }
    }

    loadSubtitle().catch(console.error)
    return () => {
      cancelled = true
      // Revoke blob URLs created in this effect run
      prevBlobUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [selectedSubtitle, videoPath])

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
    fontUrls,
    setSelectedSubtitle,
    cycleSubtitle,
    disableSubtitle
  }
}
