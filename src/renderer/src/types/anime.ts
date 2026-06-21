// ─── Subtitle ────────────────────────────────────────────────────────────────

/** Priority order: lower = higher priority */
export const SUBTITLE_FORMAT_PRIORITY: Record<string, number> = {
  '.ass': 0,
  '.ssa': 1,
  '.srt': 2,
  '.vtt': 3
}

export type SubtitleFormat = '.ass' | '.ssa' | '.srt' | '.vtt'

export type SubtitleSource = 'internal' | 'external'

export type Subtitle = {
  /** Display label, e.g. "Indonesia (ASS)" or "English (SRT)" */
  label: string
  /** Absolute file path (external) or track index as string (internal in future) */
  path: string
  extension: string
  /** Detected language from filename, e.g. "Indonesia", "English", "Unknown" */
  language: string
  /** Format category */
  format: SubtitleFormat | string
  /** Where the subtitle came from */
  source: SubtitleSource
}

// ─── Fansub ──────────────────────────────────────────────────────────────────

export type FansubInfo = {
  /** Fansub group name extracted from filename brackets, e.g. "SubsPlease" */
  fansubGroup: string | null
  /** Parsed anime title */
  animeTitle: string | null
  /** Parsed episode number */
  episode: number | null
}

// ─── Episode ─────────────────────────────────────────────────────────────────

export type Episode = {
  id: string
  title: string
  fileName: string
  filePath: string
  folderPath: string
  extension: string
  size: number
  modifiedAt: string
  subtitles: Subtitle[]
  /** Fansub metadata parsed from filename */
  fansubInfo: FansubInfo
}

// ─── Anime ───────────────────────────────────────────────────────────────────

export type Anime = {
  id: string
  name: string
  path: string
  episodes: Episode[]
}

// ─── Player State ─────────────────────────────────────────────────────────────

export type PlayerState = {
  currentTime: number
  duration: number
  isPlaying: boolean
  isMuted: boolean
  volume: number
  isFullscreen: boolean
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export type ProgressData = {
  currentTime: number
  duration: number
  watched: boolean
  updatedAt: string
}

// ─── Skip Timestamps ──────────────────────────────────────────────────────────

export type SkipTimestamps = {
  introStart?: number
  introEnd?: number
  outroStart?: number
  outroEnd?: number
}

// ─── Skip Pack ────────────────────────────────────────────────────────────────

export type SkipPackEntry = {
  episodeNumber: number
  episodeTitle?: string
  introStart?: number
  introEnd?: number
  outroStart?: number
  outroEnd?: number
}

export type SkipPack = {
  id: string
  name: string
  animeTitle?: string
  importedAt: string
  entries: SkipPackEntry[]
}

// Episode mapping: filePath -> episodeNumber (for skip pack matching)
export type EpisodeMappings = Record<string, number>
