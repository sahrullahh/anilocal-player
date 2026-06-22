/**
 * SubtitleOctopusRenderer — WebAssembly libass renderer for ASS/SSA subtitles.
 *
 * Uses `@jellyfin/libass-wasm` (SubtitlesOctopus) to render subtitles with
 * near-MPV-quality output including \pos, \move, \fad, \kf, \t transforms,
 * karaoke, and embedded-font support.
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
  onReady?: () => void
  onError?: (error: unknown) => void
}

interface SubtitlesOctopusInstance {
  dispose(): void
  resize(width?: number, height?: number): void
  setIsPaused(isPaused: boolean, currentTime?: number): void
}

type SubtitlesOctopusCtor = new (options: SubtitlesOctopusOptions) => SubtitlesOctopusInstance

// ─── Lazy loader ─────────────────────────────────────────────────────────────
// Cache the class after the first import to avoid repeated dynamic imports.

let cachedClass: SubtitlesOctopusCtor | null = null
let loadPromise: Promise<SubtitlesOctopusCtor> | null = null

function getSubtitlesOctopus(): Promise<SubtitlesOctopusCtor> {
  if (cachedClass) return Promise.resolve(cachedClass)
  if (loadPromise) return loadPromise

  loadPromise = import('@jellyfin/libass-wasm').then((mod) => {
    // CJS default: mod.default in ESM interop, or mod itself
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctor = (mod.default ?? mod) as SubtitlesOctopusCtor
    cachedClass = ctor
    return ctor
  })

  return loadPromise
}

// ─── Worker URL ───────────────────────────────────────────────────────────────
// Worker files are copied to src/renderer/public/libass/ so Vite serves them
// at /libass/ in dev. In packaged builds electron-builder copies to
// {resourcesPath}/libass/ and we use a file:// URL.

function workerUrl(filename: string): string {
  if (import.meta.env.DEV) {
    return `/libass/${filename}`
  }
  return `file://${window.__resourcesPath}/libass/${filename}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type SubtitleOctopusRendererProps = {
  assContent: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  visible: boolean
  fonts?: string[]
  onFallback: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubtitleOctopusRenderer({
  assContent,
  videoRef,
  visible,
  fonts,
  onFallback
}: SubtitleOctopusRendererProps) {
  const instanceRef = useRef<SubtitlesOctopusInstance | null>(null)
  const onFallbackRef = useRef(onFallback)
  onFallbackRef.current = onFallback
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  // Stable serialized key for fonts array — only changes when actual URLs change
  const fontsKey = fonts && fonts.length > 0 ? fonts.join('|') : ''

  // ── WASM check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof WebAssembly === 'undefined') {
      console.error('[SubtitleOctopusRenderer] WebAssembly unavailable; falling back')
      onFallbackRef.current()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Create/replace instance when assContent changes ───────────────────────
  useEffect(() => {
    if (typeof WebAssembly === 'undefined') return

    const video = videoRef.current
    if (!video || !assContent) return

    let cancelled = false

    // Dispose previous instance synchronously before async load (Property 7)
    if (instanceRef.current) {
      try { instanceRef.current.dispose() } catch { /* ignore */ }
      instanceRef.current = null
    }

    // Attach ResizeObserver immediately so resize events are captured from the
    // moment the effect runs, even before the async instance is created.
    const ro = new ResizeObserver(() => {
      if (instanceRef.current) {
        try { instanceRef.current.resize() } catch { /* ignore */ }
      }
    })
    ro.observe(video)

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
            ...(fonts && fonts.length > 0 ? { fonts } : {})
          })

          if (cancelled) {
            try { instance.dispose() } catch { /* ignore */ }
            return
          }

          instanceRef.current = instance

          // Sync initial visibility immediately after construction
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
    // Recreate instance when assContent OR fonts change.
    // fontsKey is a stable string derived from the fonts array so the effect
    // fires when font URLs arrive (e.g. after extractFonts completes) without
    // triggering on every render from array identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assContent, videoRef, fontsKey])

  // ── Visibility toggle — preserves instance (Property 8) ──────────────────
  useEffect(() => {
    const inst = instanceRef.current
    if (!inst) return
    try {
      inst.setIsPaused(!visible)
    } catch (err) {
      console.warn('[SubtitleOctopusRenderer] setIsPaused threw:', err)
    }
  }, [visible])

  // ── Unmount cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        try { instanceRef.current.dispose() } catch { /* ignore */ }
        instanceRef.current = null
      }
    }
  }, [])

  // SubtitlesOctopus appends its own canvas to video.parentElement — nothing to render
  return null
}
