// ─── Update system types ──────────────────────────────────────────────────────

export type UpdateChannel = 'stable' | 'beta'

/** What the UI needs to know about an available update. */
export interface UpdateInfo {
  /** Latest version string, e.g. "1.2.0" */
  version: string
  /** Release notes (optional) */
  releaseNotes?: string
  /** Source provider id */
  provider: string
}

/** Progress while downloading an update (0–100). */
export interface DownloadProgress {
  percent: number
  /** Bytes per second */
  bytesPerSecond: number
  transferred: number
  total: number
}

/** Possible states the updater can be in. */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

/** Events emitted by the UpdateManager to the renderer via IPC. */
export type UpdateEvent =
  | { type: 'status'; status: UpdateStatus }
  | { type: 'info'; info: UpdateInfo }
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'error'; message: string }

// ─── Provider interface ───────────────────────────────────────────────────────

export interface UpdateProvider {
  /** Unique identifier shown in UpdateInfo.provider */
  readonly id: string

  /**
   * Check whether a newer version is available.
   * Returns UpdateInfo if one is found, null otherwise.
   * Rejects on network / IO errors.
   */
  checkForUpdates(currentVersion: string, channel: UpdateChannel): Promise<UpdateInfo | null>

  /**
   * Start downloading the update.
   * Must call onProgress periodically and resolve when the download is complete.
   */
  downloadUpdate(onProgress: (p: DownloadProgress) => void): Promise<void>

  /**
   * Apply the update:
   * - For a native installer: launch it and close the app.
   * - For electron-updater: call quitAndInstall.
   */
  installUpdate(): Promise<void>

  /** Cancel an in-progress download (no-op if not downloading). */
  cancel(): void
}
