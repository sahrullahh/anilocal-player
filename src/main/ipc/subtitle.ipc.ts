import { ipcMain } from 'electron'
import { convertSrtToVtt, toFileUrl } from '../services/subtitle.service'

export function registerSubtitleIpc(): void {
  ipcMain.handle('subtitle:convertSrtToVtt', async (_, filePath: string) => {
    return convertSrtToVtt(filePath)
  })

  ipcMain.handle('subtitle:toFileUrl', async (_, filePath: string) => {
    return toFileUrl(filePath)
  })
}
