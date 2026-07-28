import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { usePlayerStore } from '../store/player.store'
import { useLibraryStore } from '../store/library.store'
import { useLibrarySettingsStore } from '../store/library-settings.store'
import type { Anime } from '../types/anime'

/**
 * Shared "open media" actions.
 *
 * Extracted from VideoPlayer's landing screen so the File menu and the landing
 * buttons run the exact same code instead of two copies drifting apart. The
 * behaviour is unchanged: pick a file, scan its parent folder so sibling
 * episodes and subtitles come along, then play the file that was chosen.
 */
export function useOpenMedia() {
  const playEpisode = usePlayerStore((s) => s.playEpisode)
  const setPlaylist = usePlayerStore((s) => s.setPlaylist)
  const resetPlayer = usePlayerStore((s) => s.resetPlayer)
  const addFolder = useLibraryStore((s) => s.addFolder)
  const setCenterMode = useLibrarySettingsStore((s) => s.setCenterMode)

  const openFile = useCallback(async () => {
    try {
      const filePath = await window.api.selectFile()
      if (!filePath) return

      const folderPath = filePath.substring(
        0,
        Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
      )
      const scanResult = await window.api.scanFolder(folderPath)

      const anime: Anime = {
        id: uuidv4(),
        name: scanResult.name,
        path: scanResult.path,
        episodes: scanResult.episodes
      }

      setPlaylist(anime.episodes)
      const target = anime.episodes.find((ep) => ep.filePath === filePath) ?? anime.episodes[0]
      if (target) {
        playEpisode(target)
        setCenterMode('player')
      }
    } catch (err) {
      console.error('Failed to open file', err)
    }
  }, [playEpisode, setPlaylist, setCenterMode])

  const openFolder = useCallback(async () => {
    try {
      await addFolder()
    } catch (err) {
      console.error('Failed to open folder', err)
    }
  }, [addFolder])

  /** Stops playback and returns to the landing screen. */
  const closeMedia = useCallback(() => {
    resetPlayer()
    setCenterMode('landing')
  }, [resetPlayer, setCenterMode])

  return { openFile, openFolder, closeMedia }
}
