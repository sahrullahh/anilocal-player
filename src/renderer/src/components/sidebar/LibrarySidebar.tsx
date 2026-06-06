import { useEffect, useState } from 'react'
import { useLibraryStore } from '../../store/library.store'
import { usePlayerStore } from '../../store/player.store'
import { Button } from '../common/Button'
import { EmptyState } from '../common/EmptyState'
import { SettingsModal } from '../settings/SettingsModal'

export function LibrarySidebar({
  onClose,
  onSelectAnime,
  onRemoveAnime
}: {
  onClose?: () => void
  onSelectAnime?: () => void
  onRemoveAnime?: (remainingCount: number) => void
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const {
    libraries,
    currentAnime,
    isLoading,
    loadLibrary,
    addFolder,
    setCurrentAnime,
    removeLibrary
  } = useLibraryStore()
  const { setPlaylist, resetPlayer } = usePlayerStore()

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  const handleSelectAnime = (anime: typeof currentAnime) => {
    if (!anime) return
    resetPlayer()
    setCurrentAnime(anime)
    setPlaylist(anime.episodes)
    onSelectAnime?.()
  }

  const handleRemoveAnime = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const remaining = libraries.filter((lib) => lib.id !== id)
    // If the removed folder was the active one, reset the player
    if (currentAnime?.id === id) {
      resetPlayer()
    }
    removeLibrary(id)
    onRemoveAnime?.(remaining.length)
  }

  return (
    <>
      <div className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-full">
        <div className="p-4 border-b border-dark-800">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-semibold text-white">Anilocal Player</h1>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-gray-500 hover:text-white hover:bg-dark-800 transition-colors"
                title="Close library"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-white">Library</h2>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1 1 0 00.95.69h.969c.969 0 1.371 1.24.588 1.81l-.784.57a1 1 0 00-.364 1.118l.3.922c.3.921-.755 1.688-1.538 1.118l-.784-.57a1 1 0 00-1.176 0l-.784.57c-.783.57-1.838-.197-1.539-1.118l.3-.922a1 1 0 00-.363-1.118l-.784-.57c-.783-.57-.38-1.81.588-1.81h.969a1 1 0 00.95-.69z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33h0A1.65 1.65 0 009 3.09V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0A1.65 1.65 0 0019.91 10H20a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  opacity="0.35"
                />
              </svg>
            </button>
          </div>
          <Button onClick={addFolder} disabled={isLoading} className="w-full" size="sm">
            {isLoading ? 'Scanning...' : '+ Add Folder'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {libraries.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              }
              title="No video folders"
              description="Add a folder to start watching"
            />
          ) : (
            <div className="p-2 space-y-1">
              {libraries.map((anime) => (
                <div
                  key={anime.id}
                  className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                    currentAnime?.id === anime.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-dark-800 text-gray-300'
                  }`}
                  onClick={() => handleSelectAnime(anime)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{anime.name}</h3>
                      <p
                        className={`text-sm mt-1 ${
                          currentAnime?.id === anime.id ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {anime.episodes.length} episodes
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRemoveAnime(e, anime.id)}
                      className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-red-600 rounded transition-all"
                      title="Remove"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}
