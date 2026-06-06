import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerFolderIpc } from './ipc/folder.ipc'
import { registerStorageIpc } from './ipc/storage.ipc'
import { registerSubtitleIpc } from './ipc/subtitle.ipc'
import { registerDiscordRpcIpc } from './ipc/discord-rpc.ipc'
import { registerOpenWithIpc } from './ipc/open-with.ipc'
import { discordRpcService } from './services/discord-rpc.service'
import path from 'path'

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi'])

/** Extract a video file path from argv (used when app is launched via file association) */
function getFilePathFromArgs(argv: string[]): string | null {
  const candidates = argv.slice(app.isPackaged ? 1 : 2)
  for (const arg of candidates) {
    if (!arg.startsWith('-') && VIDEO_EXTENSIONS.has(path.extname(arg).toLowerCase())) {
      return arg
    }
  }
  return null
}

/** Send the file path to the renderer once the window is ready */
function sendFileToRenderer(filePath: string): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('player:openFileFromContextMenu', filePath)
    })
  } else {
    win.webContents.send('player:openFileFromContextMenu', filePath)
  }
}

// Ensure only one instance runs; forward argv from second-instance to first
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('ready', () => {
  electronApp.setAppUserModelId('com.electron.anilocal')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerFolderIpc()
  registerStorageIpc()
  registerSubtitleIpc()
  registerDiscordRpcIpc()
  registerOpenWithIpc()

  void discordRpcService.connect()

  const mainWindow = createMainWindow()

  // Handle file opened at launch (double-click or "Open with" from Explorer)
  const launchFilePath = getFilePathFromArgs(process.argv)
  if (launchFilePath) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('player:openFileFromContextMenu', launchFilePath)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Handle file opened while app is already running (Windows: Open with on a running instance)
app.on('second-instance', (_event, argv) => {
  const filePath = getFilePathFromArgs(argv)
  const win = BrowserWindow.getAllWindows()[0]

  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
    if (filePath) sendFileToRenderer(filePath)
  }
})

// macOS: opened via Finder
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  sendFileToRenderer(filePath)
})

app.on('before-quit', async () => {
  await discordRpcService.disconnect()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
