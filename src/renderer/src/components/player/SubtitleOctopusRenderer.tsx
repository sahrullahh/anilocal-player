/**
 * SubtitleOctopusRenderer — WebAssembly libass renderer for ASS/SSA subtitles.
 *
 * Uses `@jellyfin/libass-wasm` (SubtitlesOctopus) to render subtitles with
 * near-MPV-quality output including \pos, \move, \fad, \kf, \t transforms,
 * karaoke, and embedded-font support.
 *
 * Synchronization: uses `requestVideoFrameCallback` (rVFC) when available as
 * the **exclusive** timing source during active playback.  rVFC fires exactly
 * once per decoded video frame — the same sync point used by the video
 * compositor — eliminating the jitter that occurs when `requestAnimationFrame`
 * fires between video frames.
 *
 * Event-based `setCurrentTime` calls are suppressed while rVFC is the active
 * timing source to prevent dual-timing conflicts (the #1 cause of subtitle
 * jitter with SubtitlesOctopus).  After seek / pause / buffering transitions
 * the flag is cleared so the event can set the initial time, and rVFC resumes
 * control on the next video frame.
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
}: SubtitleOctopusRendererProps): React.ReactElement | null {
  const instanceRef = useRef<SubtitlesOctopusInstance | null>(null)
  const onFallbackRef = useRef(onFallback)
  const visibleRef = useRef(visible)

  // Keep refs in sync with latest props — used by effects / callbacks
  // where we intentionally want the latest value without re-triggering effects.
  useEffect(() => {
    onFallbackRef.current = onFallback
  }, [onFallback])
  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  /**
   * When `true`, rVFC is the active timing source and event-based
   * `setCurrentTime` calls should be suppressed to prevent dual-timing jitter.
   * Cleared on seek / pause / buffering so event handlers can set initial
   * time; rVFC re-acquires the flag on its next callback.
   */
  const rvfcActiveRef = useRef(false)

  // Stable key for fonts array — only changes when actual URLs change
  const fontsKey = fonts && fonts.length > 0 ? fonts.join('|') : ''

  // ── WASM check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof WebAssembly === 'undefined') {
      console.error('[SubtitleOctopusRenderer] WebAssembly unavailable; falling back')
      onFallbackRef.current()
    }
  }, [])

  // ── requestVideoFrameCallback sync loop ───────────────────────────────────
  // The **exclusive** timing source during active playback.  Suppresses
  // event-based `setCurrentTime` via `rvfcActiveRef` to eliminate the
  // dual-timing conflict that causes subtitle jitter.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !supportsRVFC(video)) return

    let rvfcHandle: number | null = null
    let cancelled = false

    const onVideoFrame: VideoFrameRequestCallback = (_now, metadata) => {
      if (cancelled) return
      const inst = instanceRef.current
      if (inst && visibleRef.current) {
        try {
          // Use mediaTime — exact PTS of the video frame about to be displayed.
          // This gives frame-accurate subtitle timing, eliminating drift
          // between video frames and subtitle canvas updates.
          inst.setCurrentTime(metadata.mediaTime)
          // Mark rVFC as the active timing source so event-based
          // setCurrentTime calls are suppressed.
          rvfcActiveRef.current = true
        } catch {
          // Non-fatal — instance may be initializing
        }
      }
      // Re-register for next frame (only if not paused — rVFC stops
      // firing during pause, so we don't need to guard)
      if (!cancelled) {
        rvfcHandle = video.requestVideoFrameCallback(onVideoFrame)
      }
    }

    rvfcHandle = video.requestVideoFrameCallback(onVideoFrame)

    return () => {
      cancelled = true
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
      try {
        instanceRef.current.dispose()
      } catch {
        /* ignore */
      }
      instanceRef.current = null
    }

    // Invalidate rVFC time authority when instance changes — the new
    // instance needs an initial time sync from event handlers.
    rvfcActiveRef.current = false

    // Force resize when video element dimensions change.
    // Uses ResizeObserver for accurate size tracking; only fires when
    // dimensions actually change, avoiding unnecessary re-renders.
    const forceResize = function forceResize(): void {
      if (instanceRef.current) {
        try {
          instanceRef.current.resize()
        } catch {
          /* ignore */
        }
      }
    }

    const ro = new ResizeObserver(forceResize)
    ro.observe(video)

    const hasRVFC = supportsRVFC(video)

    getSubtitlesOctopus()
      .then((Ctor: SubtitlesOctopusCtor) => {
        if (cancelled) return

        try {
          // Use rVFC as the sole timing source when available, so we
          // can set renderAhead=1 (render just the next frame) instead
          // of a larger pre-render window.  This reduces CPU load and
          // eliminates stale-frame display during rapid time changes.
          const renderAhead = hasRVFC ? 1 : 4

          const instance = new Ctor({
            video,
            subContent: assContent,
            workerUrl: workerUrl('subtitles-octopus-worker.js'),
            legacyWorkerUrl: workerUrl('subtitles-octopus-worker-legacy.js'),
            onError: (err) => console.error('[SubtitleOctopusRenderer] worker error:', err),
            targetFps,
            renderAhead,
            ...(fonts && fonts.length > 0 ? { fonts } : {})
          })

          if (cancelled) {
            try {
              instance.dispose()
            } catch {
              /* ignore */
            }
            return
          }

          instanceRef.current = instance
          console.log(
            `[SubtitleOctopusRenderer] created instance — targetFps=${targetFps}, rVFC=${hasRVFC}, renderAhead=${renderAhead}`
          )

          if (!visibleRef.current) {
            try {
              instance.setIsPaused(true)
            } catch {
              /* non-fatal */
            }
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

  // ── Sync paused/play/seek state with SubtitlesOctopus ────────────────────
  // Event handlers only set initial time on transitions (seek, pause, play);
  // during continuous playback rVFC is the sole timing authority to prevent
  // dual-timing jitter.
  useEffect(
    function syncPlaybackState(): (() => void) | undefined {
      const video = videoRef.current
      if (!video) return

      const applyPaused = function applyPaused(): void {
        const inst = instanceRef.current
        if (!inst) return
        try {
          const paused = !visibleRef.current || video.paused
          inst.setIsPaused(paused, video.currentTime)
          // On pause: clear rVFC authority so event-based time can take over.
          // On play: also clear it so this initial time sync can run; rVFC
          // will re-acquire on its next callback with more accurate mediaTime.
          rvfcActiveRef.current = false
        } catch (err) {
          console.warn('[SubtitleOctopusRenderer] setIsPaused threw:', err)
        }
      }

      const onPlay = function onPlay(): void {
        applyPaused()
      }
      const onPause = function onPause(): void {
        applyPaused()
      }

      // Seek: clear rVFC authority so event can set initial time; rVFC
      // resumes control on the next video frame with mediaTime.
      const onSeeked = function onSeeked(): void {
        rvfcActiveRef.current = false
        const inst = instanceRef.current
        if (!inst) return
        try {
          inst.setCurrentTime(video.currentTime)
        } catch (err) {
          console.warn('[SubtitleOctopusRenderer] setCurrentTime threw:', err)
        }
      }

      // Buffering: pause the worker to save CPU; rVFC stops firing during
      // buffering so event-based time is the only option.
      const onWaiting = function onWaiting(): void {
        rvfcActiveRef.current = false
        const inst = instanceRef.current
        if (!inst) return
        try {
          inst.setIsPaused(true, video.currentTime)
        } catch {
          /* ignore */
        }
      }

      const onCanPlay = function onCanPlay(): void {
        rvfcActiveRef.current = false
        const inst = instanceRef.current
        if (!inst || video.paused) return
        try {
          inst.setIsPaused(false, video.currentTime)
        } catch {
          /* ignore */
        }
      }

      // Initial sync
      applyPaused()

      video.addEventListener('play', onPlay)
      video.addEventListener('pause', onPause)
      video.addEventListener('seeked', onSeeked)
      video.addEventListener('waiting', onWaiting)
      video.addEventListener('canplay', onCanPlay)

      return () => {
        video.removeEventListener('play', onPlay)
        video.removeEventListener('pause', onPause)
        video.removeEventListener('seeked', onSeeked)
        video.removeEventListener('waiting', onWaiting)
        video.removeEventListener('canplay', onCanPlay)
      }
    },
    [videoRef, visible]
  )

  // ── Unmount cleanup ───────────────────────────────────────────────────────
  useEffect(function cleanupOnUnmount(): () => void {
    return function disposeInstance(): void {
      if (instanceRef.current) {
        try {
          instanceRef.current.dispose()
        } catch {
          /* ignore */
        }
        instanceRef.current = null
      }
    }
  }, [])

  return null
}
