import { app, BrowserWindow } from 'electron'
import type { UpdateProvider, UpdateChannel, UpdateEvent } from './types'

/**
 * UpdateManager coordinates between multiple UpdateProviders and the renderer.
 *
 * It does NOT know about GitHub, local files, or any specific provider —
 * it only talks to providers via the UpdateProvider interface. New providers
 * (S3, Cloudflare R2, custom server, etc.) can be registered without
 * touching this class.
 *
 * Architecture:
 *   UpdateManager → UpdateProvider[]
 *                 → BrowserWindow (pushes events via webContents.send)
 */
export class UpdateManager {
  private providers = new Map<string, UpdateProvider>()
  private activeProvider: UpdateProvider | null = null
  private channel: UpdateChannel = 'stable'

  // ── Registration ─────────────────────────────────────────────────────────

  /** Register a provider. Call this once at startup. */
  registerProvider(provider: UpdateProvider): void {
    this.providers.set(provider.id, provider)
  }

  setChannel(channel: UpdateChannel): void {
    this.channel = channel
  }

  // ── Core actions ──────────────────────────────────────────────────────────

  /**
   * Check for updates using the specified provider (or all registered ones in
   * registration order, stopping at the first that finds an update).
   */
  async checkForUpdates(providerId?: string): Promise<void> {
    const currentVersion = app.getVersion()
    this.emit({ type: 'status', status: 'checking' })

    const candidates = providerId
      ? [this.providers.get(providerId)].filter(Boolean) as UpdateProvider[]
      : Array.from(this.providers.values())

    try {
      for (const provider of candidates) {
        const info = await provider.checkForUpdates(currentVersion, this.channel)
        if (info) {
          this.activeProvider = provider
          this.emit({ type: 'info', info })
          this.emit({ type: 'status', status: 'available' })
          return
        }
      }
      this.emit({ type: 'status', status: 'not-available' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.emit({ type: 'error', message })
      this.emit({ type: 'status', status: 'error' })
    }
  }

  async downloadUpdate(): Promise<void> {
    if (!this.activeProvider) {
      this.emit({ type: 'error', message: 'No update available to download.' })
      return
    }
    this.emit({ type: 'status', status: 'downloading' })
    try {
      await this.activeProvider.downloadUpdate((progress) => {
        this.emit({ type: 'progress', progress })
      })
      this.emit({ type: 'status', status: 'downloaded' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.emit({ type: 'error', message })
      this.emit({ type: 'status', status: 'error' })
    }
  }

  async installUpdate(): Promise<void> {
    if (!this.activeProvider) {
      this.emit({ type: 'error', message: 'No update ready to install.' })
      return
    }
    try {
      await this.activeProvider.installUpdate()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.emit({ type: 'error', message })
      this.emit({ type: 'status', status: 'error' })
    }
  }

  cancelDownload(): void {
    this.activeProvider?.cancel()
    this.emit({ type: 'status', status: 'idle' })
  }

  /** Trigger local-file install directly (opens file picker, then installs). */
  async installLocalPackage(): Promise<void> {
    const local = this.providers.get('local')
    if (!local) {
      this.emit({ type: 'error', message: 'Local provider not registered.' })
      return
    }
    const currentVersion = app.getVersion()
    this.emit({ type: 'status', status: 'checking' })
    try {
      const info = await local.checkForUpdates(currentVersion, this.channel)
      if (!info) {
        // User cancelled file picker
        this.emit({ type: 'status', status: 'idle' })
        return
      }
      this.activeProvider = local
      this.emit({ type: 'info', info })
      this.emit({ type: 'status', status: 'downloading' })
      await local.downloadUpdate((p) => this.emit({ type: 'progress', progress: p }))
      this.emit({ type: 'status', status: 'downloaded' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.emit({ type: 'error', message })
      this.emit({ type: 'status', status: 'error' })
    }
  }

  // ── Event broadcasting ────────────────────────────────────────────────────

  /** Push an UpdateEvent to all renderer windows. */
  private emit(event: UpdateEvent): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('updater:event', event)
      }
    })
  }
}

export const updateManager = new UpdateManager()
