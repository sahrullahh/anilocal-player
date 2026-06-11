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
}

export type Anime = {
  id: string
  name: string
  path: string
  episodes: Episode[]
}

export type Subtitle = {
  label: string
  path: string
  extension: string
}

export type PlayerState = {
  currentTime: number
  duration: number
  isPlaying: boolean
  isMuted: boolean
  volume: number
  isFullscreen: boolean
}

export type ProgressData = {
  currentTime: number
  duration: number
  watched: boolean
  updatedAt: string
}

export type SkipTimestamps = {
  introStart?: number
  introEnd?: number
  outroStart?: number
  outroEnd?: number
}

// Skip Pack types
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
