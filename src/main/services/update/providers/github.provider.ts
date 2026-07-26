import { autoUpdater, type UpdateInfo as ElectronUpdateInfo, type ProgressInfo } from 'electron-updater'
import type {
  UpdateChannel,
  UpdateInfo,
  DownloadProgress,
  UpdateProvider
} from '../types'

/**
 * GitHubProvider — wraps electron-updater's auto-update flow against
 * GitHub Releases. Uses the `publish` config in electron-builder.yml.
 *
 * To enable: set the correct `publish.owner` and `publish.repo` in
 * electron-builder.yml, and make sure GitHub releases include `latest.yml`.
 */
export class GitHubProvider implements UpdateProvider {
  readonly id = 'github'

  private downloadResolve: (() => void) | null = null
  private downloadReject: ((err: Error) => void) | null = null

  constructor() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    // Silence electron-updater's own logger — we handle events ourselves
    autoUpdater.logger = null
  }

  async checkForUpdates(currentVersion: string, channel: UpdateChannel): Promise<UpdateInfo | null> {
    autoUpdater.channel = channel === 'beta' ? 'beta' : 'latest'
    autoUpdater.allowPrerelease = channel === 'beta'

    return new Promise<UpdateInfo | null>((resolve, reject) => {
      const onAvailable = (info: ElectronUpdateInfo) => {
        cleanup()
        if (compareVersions(info.version, currentVersion) > 0) {
          resolve({
            version: info.version,
            releaseNotes: extractReleaseNotes(info.releaseNotes),
            provider: this.id
          })
        } else {
          resolve(null)
        }
      }

      const onNotAvailable = () => {
        cleanup()
        resolve(null)
      }

      const onError = (err: Error) => {
        cleanup()
        reject(err)
      }

      autoUpdater.once('update-available', onAvailable)
      autoUpdater.once('update-not-available', onNotAvailable)
      autoUpdater.once('error', onError)

      const cleanup = () => {
        autoUpdater.removeListener('update-available', onAvailable)
        autoUpdater.removeListener('update-not-available', onNotAvailable)
        autoUpdater.removeListener('error', onError)
      }

      autoUpdater.checkForUpdates().catch(reject)
    })
  }

  async downloadUpdate(onProgress: (p: DownloadProgress) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.downloadResolve = resolve
      this.downloadReject = reject

      const onProgress_ = (info: ProgressInfo) => {
        onProgress({
          percent: info.percent,
          bytesPerSecond: info.bytesPerSecond,
          transferred: info.transferred,
          total: info.total
        })
      }

      const onDownloaded = () => {
        cleanup()
        this.downloadResolve?.()
        this.downloadResolve = null
        this.downloadReject = null
      }

      const onError = (err: Error) => {
        cleanup()
        this.downloadReject?.(err)
        this.downloadResolve = null
        this.downloadReject = null
      }

      autoUpdater.on('download-progress', onProgress_)
      autoUpdater.once('update-downloaded', onDownloaded)
      autoUpdater.once('error', onError)

      const cleanup = () => {
        autoUpdater.removeListener('download-progress', onProgress_)
        autoUpdater.removeListener('update-downloaded', onDownloaded)
        autoUpdater.removeListener('error', onError)
      }

      autoUpdater.downloadUpdate().catch(reject)
    })
  }

  async installUpdate(): Promise<void> {
    // setImmediate so any pending IPC replies can flush before the app restarts
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true)
    })
  }

  cancel(): void {
    try {
      autoUpdater.autoDownload = false
      this.downloadReject?.(new Error('Download cancelled'))
      this.downloadResolve = null
      this.downloadReject = null
    } catch {
      // ignore
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ReleaseNotes = string | Array<{ note: string | null }> | null | undefined

function extractReleaseNotes(notes: ReleaseNotes): string | undefined {
  if (!notes) return undefined
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) return notes.map((n) => n.note ?? '').filter(Boolean).join('\n')
  return undefined
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [aMajor, aMinor = 0, aPatch = 0] = parse(a)
  const [bMajor, bMinor = 0, bPatch = 0] = parse(b)
  return (aMajor - bMajor) || (aMinor - bMinor) || (aPatch - bPatch)
}
