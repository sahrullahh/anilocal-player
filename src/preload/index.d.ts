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

export type SubtitleRecord = {
  label: string
  path: string
  extension: string
  language: string
  format: string
  source: 'internal' | 'external'
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
  convertSrtToVtt: (path: string) => Promise<string>
  toFileUrl: (path: string) => Promise<string>
  readSubtitleFile: (path: string) => Promise<string>
  onOpenFile: (callback: (filePath: string) => void) => () => void
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
  }
}
