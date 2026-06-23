import { useEffect, useState } from 'react'
import type { Episode } from '../types/anime'

/**
 * Probes the video file's frame rate via ffprobe and returns it.
 * Falls back to 60 if detection fails or the episode changes mid-probe.
 *
 * The returned FPS is used as `targetFps` for SubtitlesOctopus so subtitle
 * render updates are synchronized to the video's actual frame boundaries.
 */
export function useVideoFps(currentEpisode: Episode | null): number {
  const [fps, setFps] = useState<number>(60)

  useEffect(() => {
    if (!currentEpisode) {
      setFps(60)
      return
    }

    let cancelled = false

    window.api
      .probeVideoFps(currentEpisode.filePath)
      .then((detectedFps) => {
        if (cancelled) return
        if (detectedFps !== null && detectedFps > 0) {
          const rounded = roundToCommonFps(detectedFps)
          console.log(`[useVideoFps] detected ${detectedFps.toFixed(3)} fps → using ${rounded}`)
          setFps(rounded)
        } else {
          console.log('[useVideoFps] could not detect fps, using 60')
          setFps(60)
        }
      })
      .catch((err) => {
        console.warn('[useVideoFps] probe failed:', err)
        if (!cancelled) setFps(60)
      })

    return () => {
      cancelled = true
    }
  }, [currentEpisode])

  return fps
}

/**
 * Maps a raw FPS value to the nearest standard frame rate.
 * Handles fractional rates like 23.976, 29.97, 59.94.
 */
function roundToCommonFps(fps: number): number {
  const common = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120]
  let nearest = common[0]
  let minDiff = Math.abs(fps - common[0])
  for (const f of common) {
    const diff = Math.abs(fps - f)
    if (diff < minDiff) {
      minDiff = diff
      nearest = f
    }
  }
  // Snap fractional rates (23.976 → 24, 29.97 → 30, 59.94 → 60)
  if (nearest === 23.976) return 24
  if (nearest === 29.97) return 30
  if (nearest === 59.94) return 60
  return nearest
}
