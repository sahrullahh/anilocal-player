import { useEffect, useState } from 'react'
import type { Subtitle } from '../types/anime'

export function useSubtitle(subtitles: Subtitle[] = []) {
  const [selectedSubtitle, setSelectedSubtitle] = useState<Subtitle | null>(null)
  const [subtitleSrc, setSubtitleSrc] = useState<string>('')

  useEffect(() => {
    setSelectedSubtitle(subtitles[0] ?? null)
  }, [subtitles])

  useEffect(() => {
    let cancelled = false

    async function loadSubtitle() {
      if (!selectedSubtitle) {
        setSubtitleSrc('')
        return
      }

      const path =
        selectedSubtitle.extension === '.srt'
          ? await window.api.convertSrtToVtt(selectedSubtitle.path)
          : selectedSubtitle.path

      const url = await window.api.toFileUrl(path)
      if (!cancelled) setSubtitleSrc(url)
    }

    loadSubtitle().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [selectedSubtitle])

  return {
    selectedSubtitle,
    subtitleSrc,
    setSelectedSubtitle
  }
}
