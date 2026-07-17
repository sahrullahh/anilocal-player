import { ipcMain } from 'electron'
import { thumbnailService } from '../services/thumbnail.service'

export function registerThumbnailIpc(): void {
  ipcMain.handle('thumbnail:generate', async (_, videoPath: string, timeSeconds?: number) => {
    try {
      return await thumbnailService.generate(videoPath, timeSeconds)
    } catch {
      return null
    }
  })
}
