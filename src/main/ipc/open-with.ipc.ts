import { app, BrowserWindow, ipcMain, Menu, MenuItem } from 'electron'
import path from 'path'

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi'])

/**
 * Registers the context menu for video files and the IPC handler
 * that lets the renderer open a specific file in the player.
 */
export function registerOpenWithIpc(): void {
  // Handle open-with request from renderer (not strictly needed but useful for testing)
  ipcMain.handle('player:openFile', async (_, filePath: string) => {
    return filePath
  })

  // Register context menu on the webContents of every window
  app.on('browser-window-created', (_, win) => {
    attachContextMenu(win)
  })

  // Also attach to already-created windows (the main window created before this call)
  BrowserWindow.getAllWindows().forEach(attachContextMenu)
}

function attachContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_event, params) => {
    // Only show the menu when right-clicking on a link that points to a video file
    const linkUrl = params.linkURL || ''
    const srcUrl = params.srcURL || ''
    const targetUrl = linkUrl || srcUrl

    const ext = path.extname(new URL(targetUrl || 'file://x').pathname).toLowerCase()

    if (!targetUrl || !VIDEO_EXTENSIONS.has(ext)) return

    const menu = new Menu()
    menu.append(
      new MenuItem({
        label: 'Open with Video Player',
        click: () => {
          // Convert file:// URL back to a file path and send to renderer
          let filePath = targetUrl
          try {
            filePath = decodeURIComponent(new URL(targetUrl).pathname).replace(/^\/([A-Z]:)/, '$1')
          } catch {
            // keep original if URL parsing fails
          }
          win.webContents.send('player:openFileFromContextMenu', filePath)
        }
      })
    )
    menu.popup({ window: win })
  })
}
