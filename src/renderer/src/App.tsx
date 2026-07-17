import { useEffect, useState } from 'react'
import { useLibraryStore } from './store/library.store'
import { usePlayerStore } from './store/player.store'
import { useSettingsStore } from './store/settings.store'
import { useLibrarySettingsStore } from './store/library-settings.store'
import { LibrarySidebar } from './components/sidebar/LibrarySidebar'
import { EpisodeList } from './components/sidebar/EpisodeList'
import { VideoPlayer } from './components/player/VideoPlayer'
import { SplashScreen } from './components/common/SplashScreen'
import './assets/main.css'
import { v4 as uuidv4 } from 'uuid'
import type { Anime } from './types/anime'

// Minimum time the splash screen stays visible, so it doesn't just flash on
// screen for a few milliseconds when the local library/settings data loads
// almost instantly.
const MIN_SPLASH_DURATION_MS = 900

function App(): React.JSX.Element {
  const { loadLibrary } = useLibraryStore()
  const { currentEpisode, loadSavedData, playEpisode, setPlaylist } = usePlayerStore()
  const { theme } = useSettingsStore()
  const { setCenterMode } = useLibrarySettingsStore()

  const [showLibrary, setShowLibrary] = useState(false)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const start = Date.now()

    Promise.all([loadLibrary(), loadSavedData()])
      .catch((error) => console.error('Failed to load startup data', error))
      .finally(() => {
        const elapsed = Date.now() - start
        const remaining = Math.max(MIN_SPLASH_DURATION_MS - elapsed, 0)
        setTimeout(() => setShowSplash(false), remaining)
      })
  }, [loadLibrary, loadSavedData])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [theme])

  // Auto-hide sidebars when starting playback
  useEffect(() => {
    if (currentEpisode) {
      setShowLibrary(false)
      setShowEpisodes(false)
    }
  }, [currentEpisode])

  // Listen for "Open with Video Player" context menu events from main process
  useEffect(() => {
    const cleanup = window.api.onOpenFile(async (filePath: string) => {
      try {
        // Scan the parent folder to get all sibling episodes + subtitles
        const folderPath = filePath.substring(0, Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')))
        const scanResult = await window.api.scanFolder(folderPath)

        const anime: Anime = {
          id: uuidv4(),
          name: scanResult.name,
          path: scanResult.path,
          episodes: scanResult.episodes
        }

        setPlaylist(anime.episodes)

        // Find and play the specific file that was right-clicked
        const target = anime.episodes.find((ep) => ep.filePath === filePath) ?? anime.episodes[0]
        if (target) {
          playEpisode(target)
          setCenterMode('player')
        }
      } catch (err) {
        console.error('Failed to open file from context menu', err)
      }
    })
    return cleanup
  }, [playEpisode, setPlaylist])

  return (
    <div className="w-screen h-screen bg-dark-950 text-white flex overflow-hidden dark">
      <SplashScreen visible={showSplash} />

      {/* Left Sidebar - Library */}
      {showLibrary && (
        <LibrarySidebar
          onClose={() => setShowLibrary(false)}
          onSelectAnime={() => setShowEpisodes(true)}
          onRemoveAnime={(remaining) => {
            // If no folders left, close episode panel. Otherwise keep library open.
            if (remaining === 0) {
              setShowEpisodes(false)
            }
          }}
        />
      )}

      {/* Center - Video Player */}
      <VideoPlayer
        showLibrary={showLibrary}
        showEpisodes={showEpisodes}
        onToggleLibrary={() => setShowLibrary((v) => !v)}
        onToggleEpisodes={() => setShowEpisodes((v) => !v)}
      />

      {/* Right Sidebar - Episode List */}
      {showEpisodes && <EpisodeList onClose={() => setShowEpisodes(false)} />}
    </div>
  )
}

export default App
