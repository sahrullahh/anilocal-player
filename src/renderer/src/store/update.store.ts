import { create } from 'zustand'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export type UpdateChannel = 'stable' | 'beta'

export interface UpdateInfo {
  version: string
  releaseNotes?: string
  provider: string
}

export interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

interface UpdateState {
  status: UpdateStatus
  info: UpdateInfo | null
  progress: DownloadProgress | null
  error: string | null
  channel: UpdateChannel
  appVersion: string
  /** True when the current check was triggered silently (e.g. at startup),
   *  so the UI can suppress the "up to date" toast. */
  silent: boolean

  // Actions
  setStatus: (status: UpdateStatus) => void
  setInfo: (info: UpdateInfo) => void
  setProgress: (progress: DownloadProgress) => void
  setError: (error: string) => void
  setChannel: (channel: UpdateChannel) => void
  setAppVersion: (version: string) => void

  // IPC-triggered actions
  checkForUpdates: (providerId?: string, silent?: boolean) => Promise<void>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  cancelDownload: () => Promise<void>
  installLocalPackage: () => Promise<void>
}

export const useUpdateStore = create<UpdateState>((set, _get) => ({
  status: 'idle',
  info: null,
  progress: null,
  error: null,
  channel: 'stable',
  appVersion: '',
  silent: false,

  setStatus: (status) => set({ status }),
  setInfo: (info) => set({ info }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setAppVersion: (appVersion) => set({ appVersion }),

  setChannel: (channel) => {
    set({ channel })
    window.api.updater.setChannel(channel).catch(console.error)
  },

  checkForUpdates: async (providerId, silent = false) => {
    set({ status: 'checking', error: null, silent })
    await window.api.updater.check(providerId)
  },

  downloadUpdate: async () => {
    set({ status: 'downloading', progress: null })
    await window.api.updater.download()
  },

  installUpdate: async () => {
    await window.api.updater.install()
  },

  cancelDownload: async () => {
    await window.api.updater.cancel()
    set({ status: 'idle', progress: null })
  },

  installLocalPackage: async () => {
    set({ status: 'checking', error: null })
    await window.api.updater.installLocal()
  }
}))

// ── Subscribe to main-process events pushed via IPC ──────────────────────────

type UpdateEvent =
  | { type: 'status'; status: UpdateStatus }
  | { type: 'info'; info: UpdateInfo }
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'error'; message: string }

/** Call once at app startup to wire up main-process → renderer event bridge. */
export function initUpdateEventBridge(): () => void {
  return window.api.updater.onEvent((raw) => {
    const event = raw as UpdateEvent
    const store = useUpdateStore.getState()
    switch (event.type) {
      case 'status':
        store.setStatus(event.status)
        break
      case 'info':
        store.setInfo(event.info)
        break
      case 'progress':
        store.setProgress(event.progress)
        break
      case 'error':
        store.setError(event.message)
        break
    }
  })
}
