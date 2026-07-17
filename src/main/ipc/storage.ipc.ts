import { ipcMain } from 'electron'
import {
  getLibrary,
  getProgress,
  getSkipData,
  saveLibrary,
  saveProgress,
  saveSkipData,
  deleteSkipData,
  type LibraryRecord
} from '../services/storage.service'

export function registerStorageIpc(): void {
  ipcMain.handle('storage:getLibrary', async () => getLibrary())
  ipcMain.handle('storage:saveLibrary', async (_, data: LibraryRecord[]) => saveLibrary(data))
  ipcMain.handle('storage:getProgress', async () => getProgress())
  ipcMain.handle('storage:saveProgress', async (_, data) => saveProgress(data))
  ipcMain.handle('storage:getSkipData', async () => getSkipData())
  ipcMain.handle('storage:saveSkipData', async (_, data) => saveSkipData(data))
  ipcMain.handle('storage:deleteSkipData', async (_, keys?: string[]) => deleteSkipData(keys))
}
