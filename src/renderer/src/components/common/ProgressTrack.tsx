export type ProgressTone = 'accent' | 'success' | 'video'

type ProgressTrackProps = {
  value: number
  max?: number
  /** Buffered fraction, drawn between the track and the played portion. */
  buffered?: number
  tone?: ProgressTone
  /** `xs` = 2px, `sm` = 4px, `md` = 6px. */
  size?: 'xs' | 'sm' | 'md'
  className?: string
  /** Omit for purely decorative bars that duplicate nearby text. */
  label?: string
}

/**
 * Single progress bar implementation.
 *
 * Replaces four separate ones, each with its own inline width style:
 * `h-1` in PlayerControls, `h-0.5` in EpisodeList, `h-1.5` in
 * UpdatePanel, `h-2` in UpdateModal.
 */
const HEIGHTS = { xs: 'h-0.5', sm: 'h-1', md: 'h-1.5' } as const

const FILLS: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  success: 'bg-status-success',
  video: 'bg-video-content'
}

const TRACKS: Record<ProgressTone, string> = {
  accent: 'bg-surface-active',
  success: 'bg-surface-active',
  video: 'bg-video-track'
}

function clampPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.min(Math.max((value / max) * 100, 0), 100)
}

export function ProgressTrack({
  value,
  max = 100,
  buffered,
  tone = 'accent',
  size = 'sm',
  className = '',
  label
}: ProgressTrackProps) {
  const percent = clampPercent(value, max)
  const bufferedPercent = buffered != null ? clampPercent(buffered, max) : null

  return (
    <div
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(percent) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={`relative w-full overflow-hidden rounded-full ${HEIGHTS[size]} ${TRACKS[tone]} ${className}`}
    >
      {bufferedPercent != null && (
        <div
          className="absolute inset-y-0 left-0 bg-video-track-buffered"
          style={{ width: `${bufferedPercent}%` }}
        />
      )}
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${FILLS[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
