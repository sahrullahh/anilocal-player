import RPC from 'discord-rpc'
import { env } from '../config/env'

export type DiscordActivityPayload = {
  animeTitle: string
  episodeNumber: number
  currentTime: string
  duration: string
  currentTimeSeconds: number
  durationSeconds: number
  isPlaying: boolean
}

class DiscordRpcService {
  private client: RPC.Client | null = null
  private isReady = false
  private isConnecting = false
  private lastUpdateAt = 0

  async connect() {
    if (!env.discordClientId) {
      console.warn('[Discord RPC] DISCORD_CLIENT_ID is empty. Skipping connect.')
      return false
    }

    if (this.isReady) return true
    if (this.isConnecting) return false

    this.isConnecting = true

    try {
      if (!this.client) {
        this.client = new RPC.Client({ transport: 'ipc' })
        this.client.on('ready', () => {
          this.isReady = true
          console.info('[Discord RPC] Ready')
        })
        this.client.on('disconnected', () => {
          this.isReady = false
        })
      }

      await this.client.login({ clientId: env.discordClientId })
      return true
    } catch (error) {
      console.warn('[Discord RPC] Login failed. Discord may be closed.', error)
      this.isReady = false
      return false
    } finally {
      this.isConnecting = false
    }
  }

  async updateActivity(payload: DiscordActivityPayload) {
    if (!this.isReady) {
      await this.connect()
    }

    if (!this.client || !this.isReady) return

    const now = Date.now()
    if (now - this.lastUpdateAt < 15000) return

    try {
      const rawCurrent = Number.isFinite(payload.currentTimeSeconds) ? payload.currentTimeSeconds : 0
      const rawDuration = Number.isFinite(payload.durationSeconds) ? payload.durationSeconds : 0
      const clampedCurrent = Math.max(0, Math.min(rawCurrent, rawDuration || rawCurrent))
      const nowMs = Date.now()
      const startTimestamp = new Date(nowMs - clampedCurrent * 1000)

      await this.client.setActivity({
        details: `Watching ${payload.animeTitle}`,
        state: `Episode ${payload.episodeNumber} • ${payload.currentTime} / ${payload.duration}`,
        largeImageKey: 'app_logo',
        largeImageText: 'AniLocal Player',
        smallImageKey: payload.isPlaying ? 'play_icon' : 'pause_icon',
        smallImageText: payload.isPlaying ? 'Playing' : 'Paused',
        startTimestamp,
        instance: false
      })
      this.lastUpdateAt = now
    } catch (error) {
      console.warn('[Discord RPC] Failed to update activity', error)
    }
  }

  async clearActivity() {
    if (!this.client || !this.isReady) return

    try {
      await this.client.clearActivity()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('connection closed')) {
        this.isReady = false
        return
      }
      console.warn('[Discord RPC] Failed to clear activity', error)
    }
  }

  async disconnect() {
    if (!this.client) return

    try {
      await this.clearActivity()
      this.isReady = false
      this.lastUpdateAt = 0
      this.client.destroy()
      this.client = null
    } catch (error) {
      console.warn('[Discord RPC] Failed to disconnect', error)
    }
  }
}

export const discordRpcService = new DiscordRpcService()
