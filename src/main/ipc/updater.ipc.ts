import { app, ipcMain } from 'electron'
import { updateManager } from '../services/update/update-manager'
import { LocalProvider } from '../services/update/providers/local.provider'
import { GitHubProvider } from '../services/update/providers/github.provider'
import type { UpdateChannel } from '../services/update/types'

export function registerUpdaterIpc(): void {
  // Register providers once
  updateManager.registerProvider(new LocalProvider())
  updateManager.registerProvider(new GitHubProvider())

  /** Get current app version */
  ipcMain.handle('updater:version', () => app.getVersion())

  /** Check using a specific provider, or all registered providers */
  ipcMain.handle('updater:check', async (_, providerId?: string) => {
    await updateManager.checkForUpdates(providerId)
  })

  /** Start downloading the found update */
  ipcMain.handle('updater:download', async () => {
    await updateManager.downloadUpdate()
  })

  /** Restart and install */
  ipcMain.handle('updater:install', async () => {
    await updateManager.installUpdate()
  })

  /** Cancel an in-progress download */
  ipcMain.handle('updater:cancel', () => {
    updateManager.cancelDownload()
  })

  /** Open file picker and install a local package */
  ipcMain.handle('updater:installLocal', async () => {
    await updateManager.installLocalPackage()
  })

  /** Change update channel (stable / beta) */
  ipcMain.handle('updater:setChannel', (_, channel: UpdateChannel) => {
    updateManager.setChannel(channel)
  })
}
