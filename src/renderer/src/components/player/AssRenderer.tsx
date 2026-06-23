/**
 * AssRenderer — Public wrapper that routes to SubtitleOctopusRenderer (WASM libass)
 * or LegacyAssRenderer (canvas / ass-compiler) based on WebAssembly availability.
 *
 * Requirements: 4.1, 6.6
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { parse as parseAss } from 'ass-compiler'
import { SubtitleOctopusRenderer } from './SubtitleOctopusRenderer'

// ─── Public prop shape ────────────────────────────────────────────────────────

type AssRendererProps = {
  /** Raw ASS/SSA script content */
  assContent: string
  /** Reference to the <video> element for sizing & time sync */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Whether the renderer should be visible */
  visible: boolean
  /** Optional file:// URLs for MKV-embedded font attachments (passed to SubtitleOctopus) */
  fonts?: string[]
  /** Target render FPS matching the video's frame rate (default 60) */
  targetFps?: number
}

// ─── Router / public export ───────────────────────────────────────────────────

/**
 * AssRenderer renders subtitles using SubtitleOctopus (WASM libass) by default.
 * When WASM is unavailable or SubtitleOctopus signals a fallback, it switches to
 * LegacyAssRenderer (the original canvas-based ass-compiler renderer).
 */
export function AssRenderer(props: AssRendererProps) {
  const [wasmUnavailable, setWasmUnavailable] = useState(false)

  if (!wasmUnavailable) {
    return (
      <SubtitleOctopusRenderer
        {...props}
        onFallback={() => setWasmUnavailable(true)}
      />
    )
  }
  return <LegacyAssRenderer {...props} />
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

/** Convert ASS colour `&HAABBGGRR` → CSS `rgba(r,g,b,a)` */
function assColorToCss(assColor: string, defaultAlpha = 1): string {
  // &HAABBGGRR
  const hex = assColor.replace(/^&H/, '').padStart(8, '0')
  const aa = parseInt(hex.slice(0, 2), 16)
  const bb = parseInt(hex.slice(2, 4), 16)
  const gg = parseInt(hex.slice(4, 6), 16)
  const rr = parseInt(hex.slice(6, 8), 16)
  const alpha = defaultAlpha * (1 - aa / 255)
  return `rgba(${rr},${gg},${bb},${alpha.toFixed(3)})`
}

// ─── Parsed event ─────────────────────────────────────────────────────────────

type ParsedEvent = {
  start: number
  end: number
  style: string
  text: string
  marginL: number
  marginR: number
  marginV: number
}

// ─── Compiled Style ───────────────────────────────────────────────────────────

type CompiledStyle = {
  Name: string
  Fontname: string
  Fontsize: number
  PrimaryColour: string
  SecondaryColour: string
  OutlineColour: string
  BackColour: string
  Bold: boolean
  Italic: boolean
  Underline: boolean
  StrikeOut: boolean
  ScaleX: number
  ScaleY: number
  Spacing: number
  Angle: number
  BorderStyle: number
  Outline: number
  Shadow: number
  Alignment: number
  MarginL: number
  MarginR: number
  MarginV: number
}

// ─── Legacy canvas renderer (internal) ───────────────────────────────────────

/**
 * LegacyAssRenderer — Canvas-based ASS/SSA subtitle renderer using `ass-compiler`.
 *
 * Used as fallback when WebAssembly / SubtitleOctopus is unavailable.
 * `fonts` prop is accepted for interface compatibility but is not used by the
 * canvas renderer.
 *
 * Requirements: 6.6
 */
function LegacyAssRenderer({ assContent, videoRef, visible }: AssRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const parsedRef = useRef<{
    events: ParsedEvent[]
    styles: Map<string, CompiledStyle>
    scriptInfo: { PlayResX: number; PlayResY: number }
  } | null>(null)

  // Parse ASS content whenever it changes
  useEffect(() => {
    if (!assContent) {
      parsedRef.current = null
      return
    }
    try {
      const parsed = parseAss(assContent)

      // Build style map
      const styles = new Map<string, CompiledStyle>()
      if (parsed.styles?.style) {
        for (const s of parsed.styles.style) {
          styles.set(s.Name, s as unknown as CompiledStyle)
        }
      }

      // Compile events
      const events: ParsedEvent[] = []
      if (parsed.events?.dialogue) {
        for (const d of parsed.events.dialogue) {
          events.push({
            start: d.Start,
            end: d.End,
            style: d.Style,
            text: d.Text?.parsed
              ? d.Text.parsed.map((p: { text?: string }) => p.text ?? '').join('')
              : (d.Text?.raw ?? ''),
            marginL: d.Effect ? 0 : 0,
            marginR: 0,
            marginV: 0
          })
        }
      }

      // Script info
      const scriptInfo = {
        PlayResX: parsed.info?.PlayResX ? Number(parsed.info.PlayResX) : 640,
        PlayResY: parsed.info?.PlayResY ? Number(parsed.info.PlayResY) : 360
      }

      parsedRef.current = { events, styles, scriptInfo }
    } catch (err) {
      console.error('[LegacyAssRenderer] Failed to parse ASS content', err)
      parsedRef.current = null
    }
  }, [assContent])

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !parsedRef.current) {
      rafRef.current = requestAnimationFrame(render)
      return
    }

    const { events, styles, scriptInfo } = parsedRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resize canvas to match video element
    const vw = video.offsetWidth
    const vh = video.offsetHeight
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw
      canvas.height = vh
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!visible) {
      rafRef.current = requestAnimationFrame(render)
      return
    }

    const currentTime = video.currentTime
    const scaleX = canvas.width / scriptInfo.PlayResX
    const scaleY = canvas.height / scriptInfo.PlayResY

    // Filter active events
    const activeEvents = events.filter(
      (ev) => currentTime >= ev.start && currentTime < ev.end
    )

    for (const ev of activeEvents) {
      const styleDef = styles.get(ev.style) ?? styles.get('Default') ?? null
      renderEvent(ctx, ev, styleDef, scaleX, scaleY, canvas.width, canvas.height, currentTime)
    }

    rafRef.current = requestAnimationFrame(render)
  }, [videoRef, visible])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [render])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 20 }}
      aria-hidden="true"
    />
  )
}

// ─── Event rendering ──────────────────────────────────────────────────────────

function renderEvent(
  ctx: CanvasRenderingContext2D,
  ev: ParsedEvent,
  style: CompiledStyle | null,
  scaleX: number,
  scaleY: number,
  canvasW: number,
  canvasH: number,
  currentTime: number
) {
  const fontSize = Math.round((style?.Fontsize ?? 32) * scaleY)
  const fontFamily = style?.Fontname ?? 'Arial'
  const bold = style?.Bold ? 'bold ' : ''
  const italic = style?.Italic ? 'italic ' : ''
  const alignment = style?.Alignment ?? 2
  const marginV = (style?.MarginV ?? 20) * scaleY
  const marginL = (style?.MarginL ?? 20) * scaleX
  const marginR = (style?.MarginR ?? 20) * scaleX
  const outlineSize = (style?.Outline ?? 2) * scaleY
  const shadowDepth = (style?.Shadow ?? 1) * scaleY

  ctx.font = `${italic}${bold}${fontSize}px "${fontFamily}"`
  ctx.textBaseline = 'alphabetic'

  // Parse override tags for position (\pos(x,y))
  let overridePosX: number | null = null
  let overridePosY: number | null = null
  const posMatch = ev.text.match(/\\pos\(([^,)]+),([^)]+)\)/)
  if (posMatch) {
    overridePosX = parseFloat(posMatch[1]) * scaleX
    overridePosY = parseFloat(posMatch[2]) * scaleY
  }

  // Strip all override tags from text
  const cleanText = ev.text
    .replace(/\{[^}]*\}/g, '')
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\h/g, '\u00A0')

  const lines = cleanText.split('\n')

  const lineHeight = fontSize * 1.2
  const totalHeight = lines.length * lineHeight

  // Compute X position based on alignment
  let baseX: number
  let textAlign: CanvasTextAlign
  if (alignment % 3 === 1) {
    // Left
    baseX = marginL
    textAlign = 'left'
  } else if (alignment % 3 === 2) {
    // Center
    baseX = canvasW / 2
    textAlign = 'center'
  } else {
    // Right
    baseX = canvasW - marginR
    textAlign = 'right'
  }

  // Compute Y position based on alignment row
  let baseY: number
  if (alignment <= 3) {
    // Bottom
    baseY = canvasH - marginV - totalHeight + lineHeight
  } else if (alignment <= 6) {
    // Middle
    baseY = (canvasH - totalHeight) / 2 + lineHeight
  } else {
    // Top
    baseY = marginV + lineHeight
  }

  if (overridePosX !== null) baseX = overridePosX
  if (overridePosY !== null) baseY = overridePosY

  ctx.textAlign = textAlign

  const primaryColor = style?.PrimaryColour
    ? assColorToCss(style.PrimaryColour)
    : 'rgba(255,255,255,1)'
  const outlineColor = style?.OutlineColour
    ? assColorToCss(style.OutlineColour)
    : 'rgba(0,0,0,0.9)'
  const shadowColor = style?.BackColour
    ? assColorToCss(style.BackColour, 0.6)
    : 'rgba(0,0,0,0.5)'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const y = baseY + i * lineHeight

    // Shadow
    if (shadowDepth > 0) {
      ctx.fillStyle = shadowColor
      ctx.fillText(line, baseX + shadowDepth, y + shadowDepth)
    }

    // Outline (stroke)
    if (outlineSize > 0) {
      ctx.strokeStyle = outlineColor
      ctx.lineWidth = outlineSize * 2
      ctx.lineJoin = 'round'
      ctx.strokeText(line, baseX, y)
    }

    // Check karaoke: highlight syllables up to currentTime
    // Simple approach: fill whole line with primary color
    ctx.fillStyle = primaryColor
    ctx.fillText(line, baseX, y)
  }

  // Suppress unused variable warning
  void currentTime
}
