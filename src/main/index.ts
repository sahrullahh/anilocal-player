import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerFolderIpc } from './ipc/folder.ipc'
import { registerStorageIpc } from './ipc/storage.ipc'
import { registerSubtitleIpc } from './ipc/subtitle.ipc'
import { registerDiscordRpcIpc } from './ipc/discord-rpc.ipc'
import { discordRpcService } from './services/discord-rpc.service'

app.on('ready', () => {
  electronApp.setAppUserModelId('com.electron.anilocal')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerFolderIpc()
  registerStorageIpc()
  registerSubtitleIpc()
  registerDiscordRpcIpc()

  void discordRpcService.connect()

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('before-quit', async () => {
  await discordRpcService.disconnect()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
