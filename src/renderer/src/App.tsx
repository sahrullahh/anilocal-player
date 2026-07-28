import { useEffect, useState } from 'react'
import { useLibraryStore } from './store/library.store'
import { usePlayerStore } from './store/player.store'
import { useSettingsStore } from './store/settings.store'
import { useLibrarySettingsStore } from './store/library-settings.store'
import { useUpdateStore, initUpdateEventBridge } from './store/update.store'
import { LibrarySidebar } from './components/sidebar/LibrarySidebar'
import { EpisodeList } from './components/sidebar/EpisodeList'
import { VideoPlayer } from './components/player/VideoPlayer'
import { SplashScreen } from './components/common/SplashScreen'
import { TitleBar } from './components/common/TitleBar'
import { UpdateToast } from './components/common/UpdateToast'
import { UpdateModal } from './components/common/UpdateModal'
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
  const { setCenterMode, centerMode } = useLibrarySettingsStore()
  const { setAppVersion, checkForUpdates } = useUpdateStore()

  const [showLibrary, setShowLibrary] = useState(false)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  // Wire up main-process update events → renderer store, then silently check
  // for a new version once at startup. If one is found, UpdateModal pops up
  // and asks the user whether to update now or later.
  useEffect(() => {
    const cleanup = initUpdateEventBridge()
    window.api.updater.getVersion().then(setAppVersion).catch(console.error)

    // Delay the check slightly so it runs after the splash screen, avoiding a
    // popup flashing over the loading screen.
    const timer = setTimeout(() => {
      checkForUpdates('github', true).catch(console.error)
    }, MIN_SPLASH_DURATION_MS + 600)

    return () => {
      clearTimeout(timer)
      cleanup()
    }
  }, [])

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

  // Opening folder settings moves the episode list out of the center and into
  // the right sidebar, so it needs to be visible there.
  useEffect(() => {
    if (centerMode === 'library-settings') setShowEpisodes(true)
  }, [centerMode])

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
    <div className="w-screen h-screen bg-dark-950 text-white flex flex-col overflow-hidden dark">
      <SplashScreen visible={showSplash} />
      <UpdateToast />
      <UpdateModal />

      {/* Themed title bar. Windows draws the real window buttons on top of
          this strip as an overlay, tinted to match the active theme. */}
      <TitleBar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Sidebar - Library */}
      {showLibrary && (
        <LibrarySidebar
          onClose={() => setShowLibrary(false)}
          // Picking a folder shows the episode grid in the center instead of
          // the right sidebar, so the grid sits flush against this list.
          onSelectAnime={() => setShowEpisodes(false)}
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

        {/* Right Sidebar - Episode List. Hidden while the center area is
            already showing the episode grid, to avoid listing them twice. */}
        {showEpisodes && centerMode !== 'episodes' && (
          <EpisodeList onClose={() => setShowEpisodes(false)} />
        )}
      </div>
    </div>
  )
}

export default App
