import { dialog, ipcMain } from 'electron'
import { scanAnimeFolder } from '../services/scan-folder.service'

export function registerFolderIpc(): void {
  ipcMain.handle('folder:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('folder:scan', async (_, folderPath: string) => {
    return scanAnimeFolder(folderPath)
  })
}
