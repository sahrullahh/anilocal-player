import { ElectronAPI } from '@electron-toolkit/preload'

export type ProgressEntry = {
  currentTime: number
  duration: number
  watched: boolean
  updatedAt: string
}

export type SkipEntry = {
  introStart?: number
  introEnd?: number
  outroStart?: number
  outroEnd?: number
}

export type EmbeddedTrackDescriptor = {
  index: number
  language: string
  codecName: string
}

export type SubtitleRecord = {
  label: string
  path: string
  extension: string
  language: string
  format: string
  source: 'internal' | 'external' | 'embedded'
  trackIndex?: number
}

export type FansubInfoRecord = {
  fansubGroup: string | null
  animeTitle: string | null
  episode: number | null
}

export type EpisodeRecord = {
  id: string
  title: string
  fileName: string
  filePath: string
  folderPath: string
  extension: string
  size: number
  modifiedAt: string
  subtitles: SubtitleRecord[]
  fansubInfo: FansubInfoRecord
}

export type LibraryRecord = {
  id: string
  name: string
  path: string
  episodes: EpisodeRecord[]
  favorite?: boolean
}

export type DiscordActivityPayload = {
  animeTitle: string
  episodeNumber: number
  currentTime: string
  duration: string
  currentTimeSeconds: number
  durationSeconds: number
  isPlaying: boolean
}

export interface API {
  selectFolder: () => Promise<string | null>
  selectFile: () => Promise<string | null>
  selectJsonFile: () => Promise<string | null>
  readJsonFile: (filePath: string) => Promise<unknown>
  saveJsonFile: (data: unknown) => Promise<boolean>
  scanFolder: (path: string) => Promise<{
    name: string
    path: string
    episodes: EpisodeRecord[]
  }>
  getLibrary: () => Promise<{ libraries: LibraryRecord[] }>
  saveLibrary: (data: LibraryRecord[]) => Promise<{ libraries: LibraryRecord[] }>
  getProgress: () => Promise<Record<string, ProgressEntry>>
  saveProgress: (data: Record<string, ProgressEntry>) => Promise<Record<string, ProgressEntry>>
  getSkipData: () => Promise<Record<string, SkipEntry>>
  saveSkipData: (data: Record<string, SkipEntry>) => Promise<Record<string, SkipEntry>>
  deleteSkipData: (keys?: string[]) => Promise<Record<string, SkipEntry>>
  openFolder: (folderPath: string) => Promise<void>
  setTitleBarColors: (colors: {
    color: string
    symbolColor: string
    dark: boolean
  }) => Promise<void>
  closeWindow: () => Promise<void>
  convertSrtToVtt: (path: string) => Promise<string>
  toFileUrl: (path: string) => Promise<string>
  readSubtitleFile: (path: string) => Promise<string>
  readFontFile: (path: string) => Promise<Buffer | { error: string }>
  probeEmbeddedTracks: (
    videoPath: string
  ) => Promise<EmbeddedTrackDescriptor[] | { error: string }>
  probeVideoFps: (videoPath: string) => Promise<number | null>
  probeVideoDuration: (videoPath: string) => Promise<number | null>
  extractEmbeddedTrack: (
    videoPath: string,
    trackIndex: number
  ) => Promise<{ path: string } | { error: string }>
  extractFonts: (videoPath: string) => Promise<{ paths: string[] } | { error: string }>
  generateThumbnail: (videoPath: string, timeSeconds?: number) => Promise<string | null>
  onOpenFile: (callback: (filePath: string) => void) => () => void
  updater: {
    getVersion: () => Promise<string>
    check: (providerId?: string) => Promise<void>
    download: () => Promise<void>
    install: () => Promise<void>
    cancel: () => Promise<void>
    installLocal: () => Promise<void>
    setChannel: (channel: 'stable' | 'beta') => Promise<void>
    onEvent: (callback: (event: unknown) => void) => () => void
  }
  discord: {
    connect: () => Promise<boolean>
    updateActivity: (payload: DiscordActivityPayload) => Promise<void>
    setIdleActivity: () => Promise<void>
    clearActivity: () => Promise<void>
    disconnect: () => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
    /**
     * Absolute path to the Electron `resources/` directory, injected by the
     * preload script. Used in production builds to resolve packaged WASM/libass
     * asset URLs:  `file://${window.__resourcesPath}/libass/<filename>`
     */
    __resourcesPath: string
  }
}
