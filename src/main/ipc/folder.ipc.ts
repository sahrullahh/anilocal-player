import { dialog, ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import { scanAnimeFolder } from '../services/scan-folder.service'

export function registerFolderIpc(): void {
  ipcMain.handle('folder:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('folder:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('folder:selectJsonFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Skip Pack / JSON', extensions: ['json', 'skip.json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('folder:readJsonFile', async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  })

  ipcMain.handle('folder:saveJsonFile', async (_, data: unknown) => {
    try {
      const result = await dialog.showSaveDialog({
        filters: [
          { name: 'Skip Pack / JSON', extensions: ['json', 'skip.json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (result.canceled || !result.filePath) return false
      await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('folder:openFolder', async (_, folderPath: string) => {
    void shell.openPath(folderPath)
  })

  ipcMain.handle('folder:scan', async (_, folderPath: string) => {
    return scanAnimeFolder(folderPath)
  })
}
