import { ipcMain } from 'electron'
import { convertSrtToVtt, readSubtitleFile, toFileUrl } from '../services/subtitle.service'

export function registerSubtitleIpc(): void {
  ipcMain.handle('subtitle:convertSrtToVtt', async (_, filePath: string) => {
    return convertSrtToVtt(filePath)
  })

  ipcMain.handle('subtitle:toFileUrl', async (_, filePath: string) => {
    return toFileUrl(filePath)
  })

  /** Read raw subtitle file content (used for ASS/SSA rendering in renderer) */
  ipcMain.handle('subtitle:readFile', async (_, filePath: string) => {
    return readSubtitleFile(filePath)
  })
}
