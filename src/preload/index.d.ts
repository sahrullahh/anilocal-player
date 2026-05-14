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

export type LibraryRecord = {
  id: string
  name: string
  path: string
  episodes: Array<{
    id: string
    title: string
    fileName: string
    filePath: string
    folderPath: string
    extension: string
    size: number
    modifiedAt: string
    subtitles: { label: string; path: string; extension: string }[]
  }>
}

export interface API {
  selectFolder: () => Promise<string | null>
  scanFolder: (path: string) => Promise<{
    name: string
    path: string
    episodes: LibraryRecord['episodes']
  }>
  getLibrary: () => Promise<{ libraries: LibraryRecord[] }>
  saveLibrary: (data: LibraryRecord[]) => Promise<{ libraries: LibraryRecord[] }>
  getProgress: () => Promise<Record<string, ProgressEntry>>
  saveProgress: (data: Record<string, ProgressEntry>) => Promise<Record<string, ProgressEntry>>
  getSkipData: () => Promise<Record<string, SkipEntry>>
  saveSkipData: (data: Record<string, SkipEntry>) => Promise<Record<string, SkipEntry>>
  convertSrtToVtt: (path: string) => Promise<string>
  toFileUrl: (path: string) => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
