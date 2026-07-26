import { dialog, shell } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type {
  UpdateChannel,
  UpdateInfo,
  DownloadProgress,
  UpdateProvider
} from '../types'

/**
 * LocalProvider — lets the user manually select an installer file from disk
 * and launch it. No network requests involved.
 */
export class LocalProvider implements UpdateProvider {
  readonly id = 'local'

  /** Path selected by the user; set after checkForUpdates() resolves. */
  private selectedPath: string | null = null

  async checkForUpdates(currentVersion: string, _channel: UpdateChannel): Promise<UpdateInfo | null> {
    const result = await dialog.showOpenDialog({
      title: 'Select Update Package',
      filters: [
        { name: 'Installer', extensions: ['exe', 'dmg', 'AppImage', 'deb', 'rpm', 'snap'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]

    // Basic sanity check — file must exist and be readable
    try {
      await fs.access(filePath)
    } catch {
      throw new Error(`File not accessible: ${filePath}`)
    }

    // Try to extract version from filename, e.g. "anilocal-player-1.2.0-setup.exe"
    const basename = path.basename(filePath)
    const versionMatch = basename.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/)
    const detectedVersion = versionMatch?.[1] ?? 'unknown'

    // If we could parse a version and it doesn't beat the current one, warn but
    // still allow: the user knows what they're installing.
    if (detectedVersion !== 'unknown') {
      const isSameOrOlder = compareVersions(detectedVersion, currentVersion) <= 0
      if (isSameOrOlder) {
        // Return info anyway — the user explicitly chose this file
        this.selectedPath = filePath
        return {
          version: detectedVersion,
          releaseNotes: `Local package selected: ${basename}`,
          provider: this.id
        }
      }
    }

    this.selectedPath = filePath
    return {
      version: detectedVersion,
      releaseNotes: `Local package selected: ${basename}`,
      provider: this.id
    }
  }

  // Nothing to download — the file is already on disk.
  async downloadUpdate(_onProgress: (p: DownloadProgress) => void): Promise<void> {
    // Instantly "complete" since the file was already selected
    _onProgress({ percent: 100, bytesPerSecond: 0, transferred: 0, total: 0 })
  }

  async installUpdate(): Promise<void> {
    if (!this.selectedPath) {
      throw new Error('No local installer selected. Call checkForUpdates() first.')
    }
    // On Windows: launch the installer then let the OS close the app.
    // On macOS/Linux: open the file with the default handler (Finder / file manager).
    const error = await shell.openPath(this.selectedPath)
    if (error) throw new Error(`Failed to launch installer: ${error}`)
    // Give the installer a moment to start before we close
    setTimeout(() => {
      // Dynamic import to avoid top-level app import at module load time
      import('electron').then(({ app }) => app.quit())
    }, 1500)
  }

  cancel(): void {
    // No-op: local installs are instantaneous
  }
}

// ─── Semver-lite comparison ───────────────────────────────────────────────────

/** Returns negative if a < b, 0 if equal, positive if a > b. */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [aMajor, aMinor = 0, aPatch = 0] = parse(a)
  const [bMajor, bMinor = 0, bPatch = 0] = parse(b)
  return (aMajor - bMajor) || (aMinor - bMinor) || (aPatch - bPatch)
}
