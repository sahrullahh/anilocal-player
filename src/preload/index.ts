import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  source: 'internal' | 'external' | 'embedded'
  trackIndex?: number
}

export type EmbeddedTrackDescriptor = {
  index: number
  language: string
  codecName: string
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

const api = {
  selectFolder: () => ipcRenderer.invoke('folder:select'),
  selectFile: () => ipcRenderer.invoke('folder:selectFile'),
  selectJsonFile: () => ipcRenderer.invoke('folder:selectJsonFile'),
  readJsonFile: (filePath: string) => ipcRenderer.invoke('folder:readJsonFile', filePath),
  scanFolder: (path: string) => ipcRenderer.invoke('folder:scan', path),
  getLibrary: () => ipcRenderer.invoke('storage:getLibrary'),
  saveLibrary: (data: LibraryRecord[]) => ipcRenderer.invoke('storage:saveLibrary', data),
  getProgress: () => ipcRenderer.invoke('storage:getProgress'),
  saveProgress: (data: Record<string, ProgressEntry>) =>
    ipcRenderer.invoke('storage:saveProgress', data),
  getSkipData: () => ipcRenderer.invoke('storage:getSkipData'),
  saveSkipData: (data: Record<string, SkipEntry>) =>
    ipcRenderer.invoke('storage:saveSkipData', data),
  convertSrtToVtt: (path: string) => ipcRenderer.invoke('subtitle:convertSrtToVtt', path),
  toFileUrl: (path: string) => ipcRenderer.invoke('subtitle:toFileUrl', path),
  readSubtitleFile: (path: string) => ipcRenderer.invoke('subtitle:readFile', path),
  readFontFile: (path: string) => ipcRenderer.invoke('subtitle:readFontFile', path) as Promise<Buffer | { error: string }>,
  probeEmbeddedTracks: (videoPath: string) =>
    ipcRenderer.invoke('subtitle:probeEmbeddedTracks', videoPath),
  extractEmbeddedTrack: (videoPath: string, trackIndex: number) =>
    ipcRenderer.invoke('subtitle:extractEmbeddedTrack', videoPath, trackIndex),
  extractFonts: (videoPath: string) => ipcRenderer.invoke('subtitle:extractFonts', videoPath),
  onOpenFile: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
    ipcRenderer.on('player:openFileFromContextMenu', handler)
    // Return cleanup function
    return () => ipcRenderer.removeListener('player:openFileFromContextMenu', handler)
  },
  discord: {
    connect: () => ipcRenderer.invoke('discord:connect'),
    updateActivity: (payload: DiscordActivityPayload) =>
      ipcRenderer.invoke('discord:updateActivity', payload),
    setIdleActivity: () => ipcRenderer.invoke('discord:setIdleActivity'),
    clearActivity: () => ipcRenderer.invoke('discord:clearActivity'),
    disconnect: () => ipcRenderer.invoke('discord:disconnect')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    // Inject resourcesPath so the renderer can locate packaged WASM/libass assets
    // (e.g. SubtitleOctopusRenderer needs {resourcesPath}/libass/ in production)
    contextBridge.exposeInMainWorld('__resourcesPath', process.resourcesPath)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.__resourcesPath = process.resourcesPath
}
