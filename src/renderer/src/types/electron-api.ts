export type ElectronAPI = {
  selectFolder: () => Promise<string | null>
  scanFolder: (path: string) => Promise<{
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
  }>
  getLibrary: () => Promise<{ libraries: Array<any> }>
  saveLibrary: (data: any[]) => Promise<{ libraries: Array<any> }>
  getProgress: () => Promise<Record<string, any>>
  saveProgress: (data: Record<string, any>) => Promise<Record<string, any>>
  getSkipData: () => Promise<Record<string, any>>
  saveSkipData: (data: Record<string, any>) => Promise<Record<string, any>>
  convertSrtToVtt: (path: string) => Promise<string>
  toFileUrl: (path: string) => Promise<string>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
