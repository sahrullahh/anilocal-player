import { ipcMain } from 'electron'
import { embeddedSubtitleService } from '../services/embedded-subtitle.service'
import { convertSrtToVtt, readFontFile, readSubtitleFile, toFileUrl } from '../services/subtitle.service'

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

  /**
   * Read a font file as a Buffer so the renderer can create a Blob URL.
   * Web Workers cannot fetch file:// URLs, so fonts must be served as blob:.
   */
  ipcMain.handle('subtitle:readFontFile', async (_, filePath: string) => {
    try {
      return await readFontFile(filePath)
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  /**
   * Returns the FPS of the first video stream.
   * Renderer calls: ipcRenderer.invoke('subtitle:probeVideoFps', videoPath)
   * Output: number | null
   */
  ipcMain.handle('subtitle:probeVideoFps', async (_, videoPath: string) => {
    try {
      return await embeddedSubtitleService.probeVideoFps(videoPath)
    } catch {
      return null
    }
  })

  /**
   * Returns the duration (in seconds) of a video file.
   * Renderer calls: ipcRenderer.invoke('subtitle:probeVideoDuration', videoPath)
   * Output: number | null
   */
  ipcMain.handle('subtitle:probeVideoDuration', async (_, videoPath: string) => {
    try {
      return await embeddedSubtitleService.probeVideoDuration(videoPath)
    } catch {
      return null
    }
  })

  /**
   * Probes an MKV file for embedded subtitle tracks.
   * Renderer calls: ipcRenderer.invoke('subtitle:probeEmbeddedTracks', videoPath)
   * Output: EmbeddedTrackDescriptor[]  |  { error: string }
   * Requirements: 8.1, 8.3
   */
  ipcMain.handle('subtitle:probeEmbeddedTracks', async (_, videoPath: string) => {
    try {
      return await embeddedSubtitleService.probeEmbeddedTracks(videoPath)
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  /**
   * Extracts a specific embedded subtitle track to an .ass file.
   * Renderer calls: ipcRenderer.invoke('subtitle:extractEmbeddedTrack', videoPath, trackIndex)
   * Output: { path: string }  |  { error: string }
   * Requirements: 8.2, 8.3
   */
  ipcMain.handle(
    'subtitle:extractEmbeddedTrack',
    async (_, videoPath: string, trackIndex: number) => {
      try {
        return await embeddedSubtitleService.extractEmbeddedTrack(videoPath, trackIndex)
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  /**
   * Extracts font attachments from an MKV file.
   * Renderer calls: ipcRenderer.invoke('subtitle:extractFonts', videoPath)
   * Output: { paths: string[] }  |  { error: string }
   * Requirements: 8.1
   */
  ipcMain.handle('subtitle:extractFonts', async (_, videoPath: string) => {
    try {
      const result = await embeddedSubtitleService.extractFonts(videoPath)
      if ('error' in result) {
        return result
      }
      return { paths: result }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}
