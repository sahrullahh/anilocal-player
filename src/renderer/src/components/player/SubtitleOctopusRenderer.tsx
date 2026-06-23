/**
 * SubtitleOctopusRenderer — WebAssembly libass renderer for ASS/SSA subtitles.
 *
 * Uses `@jellyfin/libass-wasm` (SubtitlesOctopus) to render subtitles with
 * near-MPV-quality output including \pos, \move, \fad, \kf, \t transforms,
 * karaoke, and embedded-font support.
 *
 * Synchronization: uses `requestVideoFrameCallback` (rVFC) when available so
 * subtitle timing updates fire exactly once per decoded video frame — the same
 * sync point used by the video compositor — eliminating the jitter that occurs
 * when `requestAnimationFrame` fires between video frames.
 *
 * Falls back via `onFallback` prop when WebAssembly is unavailable.
 *
 * Requirements: 4.1, 4.3, 4.4, 4.6, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { useEffect, useRef } from 'react'

// ─── Type shim ────────────────────────────────────────────────────────────────
// @jellyfin/libass-wasm ships no .d.ts

interface SubtitlesOctopusOptions {
  video?: HTMLVideoElement
  subContent?: string
  workerUrl: string
  legacyWorkerUrl: string
  fonts?: string[]
  targetFps?: number
  timeOffset?: number
  renderAhead?: number
  renderMode?: 'wasm-blend' | 'lossy'
  onReady?: () => void
  onError?: (error: unknown) => void
}

interface SubtitlesOctopusInstance {
  dispose(): void
  resize(width?: number, height?: number): void
  setIsPaused(isPaused: boolean, currentTime?: number): void
  setCurrentTime(currentTime: number): void
}

type SubtitlesOctopusCtor = new (options: SubtitlesOctopusOptions) => SubtitlesOctopusInstance

// ─── rVFC support check ───────────────────────────────────────────────────────

function supportsRVFC(video: HTMLVideoElement): boolean {
  return typeof video.requestVideoFrameCallback === 'function'
}

// ─── Lazy loader ─────────────────────────────────────────────────────────────

let cachedClass: SubtitlesOctopusCtor | null = null
let loadPromise: Promise<SubtitlesOctopusCtor> | null = null

function getSubtitlesOctopus(): Promise<SubtitlesOctopusCtor> {
  if (cachedClass) return Promise.resolve(cachedClass)
  if (loadPromise) return loadPromise

  loadPromise = import('@jellyfin/libass-wasm').then((mod) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctor = (mod.default ?? mod) as SubtitlesOctopusCtor
    cachedClass = ctor
    return ctor
  })

  return loadPromise
}

// ─── Worker URL ───────────────────────────────────────────────────────────────

function workerUrl(filename: string): string {
  if (import.meta.env.DEV) {
    return `/libass/${filename}`
  }
  const resourcesPath = window.__resourcesPath.replace(/\\/g, '/')
  const sep = resourcesPath.startsWith('/') ? '' : '/'
  return `file://${sep}${resourcesPath}/libass/${filename}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type SubtitleOctopusRendererProps = {
  assContent: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  visible: boolean
  fonts?: string[]
  /** Target FPS matching the video's frame rate — defaults to 60 */
  targetFps?: number
  onFallback: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubtitleOctopusRenderer({
  assContent,
  videoRef,
  visible,
  fonts,
  targetFps = 60,
  onFallback
}: SubtitleOctopusRendererProps) {
  const instanceRef = useRef<SubtitlesOctopusInstance | null>(null)
  const onFallbackRef = useRef(onFallback)
  onFallbackRef.current = onFallback
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  // Stable key for fonts array — only changes when actual URLs change
  const fontsKey = fonts && fonts.length > 0 ? fonts.join('|') : ''

  // ── WASM check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof WebAssembly === 'undefined') {
      console.error('[SubtitleOctopusRenderer] WebAssembly unavailable; falling back')
      onFallbackRef.current()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── requestVideoFrameCallback sync loop ───────────────────────────────────
  // Fires exactly once per decoded video frame — perfect sync point for
  // updating SubtitlesOctopus timing before the frame is composited.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !supportsRVFC(video)) return

    let rvfcHandle: number | null = null

    const onVideoFrame: VideoFrameRequestCallback = (_now, metadata) => {
      const inst = instanceRef.current
      if (inst && visibleRef.current) {
        try {
          // Use mediaTime — exact PTS of the video frame about to be displayed.
          // This gives frame-accurate subtitle timing, eliminating drift
          // between video frames and subtitle canvas updates.
          inst.setCurrentTime(metadata.mediaTime)
        } catch {
          // Non-fatal — instance may be initializing
        }
      }
      // Re-register for next frame
      rvfcHandle = video.requestVideoFrameCallback(onVideoFrame)
    }

    rvfcHandle = video.requestVideoFrameCallback(onVideoFrame)

    return () => {
      if (rvfcHandle !== null) {
        video.cancelVideoFrameCallback(rvfcHandle)
      }
    }
  }, [videoRef])

  // ── Create/replace instance when assContent, fonts, or targetFps changes ──
  useEffect(() => {
    if (typeof WebAssembly === 'undefined') return

    const video = videoRef.current
    if (!video || !assContent) return

    let cancelled = false

    // Dispose previous instance before creating new one
    if (instanceRef.current) {
      try { instanceRef.current.dispose() } catch { /* ignore */ }
      instanceRef.current = null
    }

    const ro = new ResizeObserver(() => {
      if (instanceRef.current) {
        try { instanceRef.current.resize() } catch { /* ignore */ }
      }
    })
    ro.observe(video)

    const hasRVFC = supportsRVFC(video)

    getSubtitlesOctopus()
      .then((Ctor) => {
        if (cancelled) return

        try {
          const instance = new Ctor({
            video,
            subContent: assContent,
            workerUrl: workerUrl('subtitles-octopus-worker.js'),
            legacyWorkerUrl: workerUrl('subtitles-octopus-worker-legacy.js'),
            onError: (err) => console.error('[SubtitleOctopusRenderer] worker error:', err),
            targetFps,
            // renderAhead: pre-render frames ahead to eliminate pop-in jitter.
            // With rVFC we get perfect frame timing; renderAhead ensures the
            // worker has rendered the frame before we need to display it.
            renderAhead: 4,
            ...(fonts && fonts.length > 0 ? { fonts } : {})
          })

          if (cancelled) {
            try { instance.dispose() } catch { /* ignore */ }
            return
          }

          instanceRef.current = instance
          console.log(
            `[SubtitleOctopusRenderer] created instance — targetFps=${targetFps}, rVFC=${hasRVFC}`
          )

          if (!visibleRef.current) {
            try { instance.setIsPaused(true) } catch { /* non-fatal */ }
          }
        } catch (err) {
          console.error('[SubtitleOctopusRenderer] failed to construct instance:', err)
          if (!cancelled) onFallbackRef.current()
        }
      })
      .catch((err) => {
        console.error('[SubtitleOctopusRenderer] failed to load library:', err)
        if (!cancelled) onFallbackRef.current()
      })

    return () => {
      cancelled = true
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assContent, videoRef, fontsKey, targetFps])

  // ── Sync paused/play/seek state with SubtitlesOctopus — reduces jitter/CPU
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const applyPaused = () => {
      const inst = instanceRef.current
      if (!inst) return
      try {
        // Pause worker when overlay hidden or when video is paused. Provide currentTime
        // so the worker can render the correct frame immediately after unpausing.
        inst.setIsPaused(!visibleRef.current || video.paused, video.currentTime)
      } catch (err) {
        console.warn('[SubtitleOctopusRenderer] setIsPaused threw:', err)
      }
    }

    const onPlay = () => applyPaused()
    const onPause = () => applyPaused()
    const onSeeked = () => {
      const inst = instanceRef.current
      if (!inst) return
      try {
        inst.setCurrentTime(video.currentTime)
      } catch (err) {
        console.warn('[SubtitleOctopusRenderer] setCurrentTime threw:', err)
      }
    }

    // Initial sync
    applyPaused()

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeked', onSeeked)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeked', onSeeked)
    }
  }, [videoRef, visible])

  // ── Unmount cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        try { instanceRef.current.dispose() } catch { /* ignore */ }
        instanceRef.current = null
      }
    }
  }, [])

  return null
}
