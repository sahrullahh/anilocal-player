import { useEffect } from 'react'
import { useLibraryStore } from './store/library.store'
import { usePlayerStore } from './store/player.store'
import { useSettingsStore } from './store/settings.store'
import { LibrarySidebar } from './components/sidebar/LibrarySidebar'
import { EpisodeList } from './components/sidebar/EpisodeList'
import { VideoPlayer } from './components/player/VideoPlayer'
import './assets/main.css'

function App(): React.JSX.Element {
  const { loadLibrary } = useLibraryStore()
  const { loadSavedData } = usePlayerStore()
  const { theme } = useSettingsStore()

  useEffect(() => {
    loadLibrary()
    loadSavedData()
  }, [loadLibrary, loadSavedData])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="w-screen h-screen bg-dark-950 text-white flex overflow-hidden dark">
      {/* Left Sidebar - Library */}
      <LibrarySidebar />

      {/* Center - Video Player */}
      <VideoPlayer />

      {/* Right Sidebar - Episode List */}
      <EpisodeList />
    </div>
  )
}

export default App
