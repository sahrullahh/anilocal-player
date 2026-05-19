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
  discord: {
    connect: () => ipcRenderer.invoke('discord:connect'),
    updateActivity: (payload: DiscordActivityPayload) =>
      ipcRenderer.invoke('discord:updateActivity', payload),
    clearActivity: () => ipcRenderer.invoke('discord:clearActivity'),
    disconnect: () => ipcRenderer.invoke('discord:disconnect')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
