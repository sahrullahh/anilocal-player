/**
 * Shared icon set.
 *
 * Every path here is lifted verbatim from the inline SVGs that were
 * scattered across the renderer — no icon changes shape. What is
 * normalised is the parts that were inconsistent: stroke width was a
 * mix of 1.5 / 1.8 / 2 / 2.5, sizes were ad-hoc per call site, and the
 * folder icon was redrawn in four different files.
 *
 * Outline icons use stroke 1.75. Solid icons (playback transport) keep
 * `fill` because a filled play triangle reads better at small sizes.
 */
import React from 'react'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg'

const SIZE: Record<IconSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

type IconProps = {
  size?: IconSize
  className?: string
}

function Outline({
  size = 'sm',
  className = '',
  children
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={`${SIZE[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

function Solid({
  size = 'sm',
  className = '',
  viewBox = '0 0 20 20',
  children
}: IconProps & { viewBox?: string; children: React.ReactNode }) {
  return (
    <svg
      className={`${SIZE[size]} ${className}`}
      fill="currentColor"
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/* ── Navigation & chrome ─────────────────────────────────────────── */

export const CloseIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M6 18L18 6M6 6l12 12" />
  </Outline>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M9 5l7 7-7 7" />
  </Outline>
)

export const FolderIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </Outline>
)

export const FolderOpenIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v1M2 6v12a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2H2" />
  </Outline>
)

export const ListIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </Outline>
)

export const SettingsIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1 1 0 00.95.69h.969c.969 0 1.371 1.24.588 1.81l-.784.57a1 1 0 00-.364 1.118l.3.922c.3.921-.755 1.688-1.538 1.118l-.784-.57a1 1 0 00-1.176 0l-.784.57c-.783.57-1.838-.197-1.539-1.118l.3-.922a1 1 0 00-.363-1.118l-.784-.57c-.783-.57-.38-1.81.588-1.81h.969a1 1 0 00.95-.69z" />
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </Outline>
)

export const PlusIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M12 4v16m8-8H4" />
  </Outline>
)

export const TrashIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </Outline>
)

export const RefreshIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </Outline>
)

export const SearchIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
  </Outline>
)

/* ── Playback transport ─────────────────────────────────────────── */

export const PlayIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
  </Solid>
)

export const PauseIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M5.75 1.5A.75.75 0 005 2.25v15.5a.75.75 0 001.5 0V2.25A.75.75 0 005.75 1.5zm8.5 0a.75.75 0 00-.75.75v15.5a.75.75 0 001.5 0V2.25a.75.75 0 00-.75-.75z" />
  </Solid>
)

export const PlayCircleIcon = (p: IconProps) => (
  <Solid {...p}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
    />
  </Solid>
)

export const PrevEpisodeIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M8.445 14.832A1 1 0 0010 14V6a1 1 0 00-1.555-.832l-5 3.5a1 1 0 000 1.664l5 3.5zM17 5a1 1 0 00-1 1v8a1 1 0 002 0V6a1 1 0 00-1-1z" />
  </Solid>
)

export const NextEpisodeIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M3 5a1 1 0 011 1v8a1 1 0 01-2 0V6a1 1 0 011-1zm10.555 1.168A1 1 0 0012 7v6a1 1 0 001.555.832l5-3.5a1 1 0 000-1.664l-5-3.5z" />
  </Solid>
)

export const SeekBackIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
    <path d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
  </Outline>
)

export const SeekForwardIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
  </Outline>
)

export const RepeatIcon = RefreshIcon

export const AutoplayIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </Outline>
)

export const FullscreenIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
  </Outline>
)

/* ── Audio ──────────────────────────────────────────────────────── */

export const VolumeMuteIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.172a1 1 0 011.414 0A6.972 6.972 0 0118 10a6.972 6.972 0 01-1.929 4.828 1 1 0 01-1.414-1.414A4.972 4.972 0 0016 10c0-1.713-.672-3.259-1.757-4.364a1 1 0 010-1.414z" />
  </Solid>
)

/** Low volume — one arc. Previously missing: the player only had mute
 *  and high, so there was no feedback for quiet-but-audible levels. */
export const VolumeLowIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.586 4.172a1 1 0 011.414 0 4 4 0 010 5.656 1 1 0 01-1.414-1.414 2 2 0 000-2.828 1 1 0 010-1.414z" />
  </Solid>
)

export const VolumeHighIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 2.172a1 1 0 011.414 0 8 8 0 010 11.314 1 1 0 01-1.414-1.414 6 6 0 000-8.486 1 1 0 010-1.414zM12.586 4.172a1 1 0 011.414 0 4 4 0 010 5.656 1 1 0 01-1.414-1.414 2 2 0 000-2.828 1 1 0 010-1.414z" />
  </Solid>
)

/* ── Subtitles & media ──────────────────────────────────────────── */

export const SubtitleIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </Outline>
)

export const VideoOffIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </Outline>
)

export const CollectionIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </Outline>
)

export const BookmarkIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </Outline>
)

export const FilmIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </Outline>
)

/* ── Status & transfer ──────────────────────────────────────────── */

export const CheckCircleIcon = (p: IconProps) => (
  <Solid {...p}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
    />
  </Solid>
)

export const CheckIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M5 13l4 4L19 7" />
  </Outline>
)

export const AlertIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </Outline>
)

export const InfoIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Outline>
)

export const DownloadIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
  </Outline>
)

export const ImportIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </Outline>
)

export const ExportIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </Outline>
)
