import { useEffect, useMemo, useState } from 'react'
import { useLibraryStore } from '../../store/library.store'
import { usePlayerStore } from '../../store/player.store'
import { useLibrarySettingsStore } from '../../store/library-settings.store'
import { Button } from '../common/Button'
import { EmptyState } from '../common/EmptyState'
import { SettingsModal } from '../settings/SettingsModal'
import { buildEpisodeTree, countEpisodes } from '../../utils/episodeTree'
import type { EpisodeTreeNode } from '../../utils/episodeTree'
import type { Anime } from '../../types/anime'

/**
 * Recursive rows for sub-folders nested inside a library (anime) entry.
 *
 * IMPORTANT: this panel only ever shows folder names — never episode
 * filenames. Episodes are shown exclusively in the separate Episode List
 * panel, and only the videos located *directly* inside the folder that was
 * last clicked (non-recursive) — never videos from nested sub-folders.
 */
function AnimeSubFolders({
  node,
  keyPrefix,
  path,
  depth,
  expanded,
  toggleExpanded,
  selectedKey,
  onSelectFolder
}: {
  node: EpisodeTreeNode
  keyPrefix: string
  path: string[]
  depth: number
  expanded: Set<string>
  toggleExpanded: (key: string) => void
  selectedKey: string | null
  onSelectFolder: (node: EpisodeTreeNode, key: string, path: string[], name: string) => void
}) {
  return (
    <>
      {Array.from(node.folders.entries()).map(([name, child]) => {
        const key = `${keyPrefix}/${name}`
        const childPath = [...path, name]
        const isExpanded = expanded.has(key)
        const hasChildren = child.folders.size > 0
        const isActive = selectedKey === key

        return (
          <div key={key}>
            <div
              className={`group flex items-center gap-1.5 rounded-lg py-1.5 pr-2 cursor-pointer transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'hover:bg-dark-800 text-gray-300'
              }`}
              style={{ paddingLeft: 12 + depth * 16 }}
              onClick={() => {
                // Clicking a folder always loads only its *direct* videos into
                // the Episode List (non-recursive), and also toggles the
                // visibility of its own sub-folders here so the user can drill
                // further down one level at a time.
                onSelectFolder(child, key, childPath, name)
                if (hasChildren) toggleExpanded(key)
              }}
            >
              {hasChildren ? (
                <svg
                  className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <span className="w-3 flex-shrink-0" />
              )}
              <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 6a2 2 0 012-2h6l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-sm truncate flex-1">{name}</span>
              <span className={`text-xs flex-shrink-0 ${isActive ? 'text-blue-100' : 'text-gray-600'}`}>
                {countEpisodes(child)}
              </span>
            </div>

            {isExpanded && (
              <AnimeSubFolders
                node={child}
                keyPrefix={key}
                path={childPath}
                depth={depth + 1}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
                selectedKey={selectedKey}
                onSelectFolder={onSelectFolder}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  // Which anime's folder tree is currently expanded in the list (only one at a time)
  const [openAnimeId, setOpenAnimeId] = useState<string | null>(null)
  // Expanded sub-folder keys, scoped by "animeId/sub/path" so switching anime resets naturally
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  // Currently selected folder key (for highlight). null = anime root folder itself.
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(null)
  const {
    libraries,
    currentAnime,
    isLoading,
    loadLibrary,
    addFolder,
    setCurrentAnime,
    removeLibrary,
    reorderLibrary
  } = useLibraryStore()
  const { setPlaylist, resetPlayer } = usePlayerStore()
  const { selectAnime, resetSettings } = useLibrarySettingsStore()

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  // Per-anime folder tree (built lazily/memoized per library list identity)
  const treesByAnimeId = useMemo(() => {
    const map = new Map<string, EpisodeTreeNode>()
    for (const anime of libraries) {
      map.set(anime.id, buildEpisodeTree(anime.episodes))
    }
    return map
  }, [libraries])

  const toggleExpandedFolder = (key: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /**
   * Opens the given anime's ROOT folder. Loads only the videos located
   * directly in that root folder (non-recursive) — e.g. `Trailer.mp4` and
   * `PV.mp4` sitting next to `Season 1/` and `Season 2/`, but not the
   * episodes inside those sub-folders. If the folder has sub-folders, this
   * also expands the folder tree so the user can drill into them.
   */
  const handleSelectAnimeRoot = (anime: Anime) => {
    const tree = treesByAnimeId.get(anime.id)
    setSelectedFolderKey(null)

    const rootEpisodes = tree ? tree.episodes : anime.episodes
    const scopedAnime: Anime = { ...anime, episodes: rootEpisodes }

    resetPlayer()
    setCurrentAnime(scopedAnime)
    setPlaylist(rootEpisodes)
    selectAnime(scopedAnime)
    onSelectAnime?.()

    const hasSubFolders = (tree?.folders.size ?? 0) > 0
    if (hasSubFolders) {
      setOpenAnimeId((prev) => (prev === anime.id ? null : anime.id))
    }
  }

  /**
   * Opens a sub-folder. Loads only the videos located directly inside that
   * sub-folder (non-recursive) — deeper nested sub-folders are not included
   * until the user drills into them individually.
   */
  const handleSelectSubFolder = (
    anime: Anime,
    node: EpisodeTreeNode,
    key: string,
    folderPath: string[]
  ) => {
    setSelectedFolderKey(key)
    const directEpisodes = node.episodes
    const scopedAnime: Anime = {
      ...anime,
      name: `${anime.name} / ${folderPath.join(' / ')}`,
      episodes: directEpisodes
    }
    resetPlayer()
    setCurrentAnime(scopedAnime)
    setPlaylist(directEpisodes)
    selectAnime(scopedAnime)
    onSelectAnime?.()
  }

  const handleRemoveAnime = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const remaining = libraries.filter((lib) => lib.id !== id)
    if (currentAnime?.id === id) {
      resetPlayer()
      resetSettings()
    }
    removeLibrary(id)
    onRemoveAnime?.(remaining.length)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(index)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderLibrary(dragIndex, toIndex)
    }
    setDragIndex(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropTarget(null)
  }

  return (
    <>
      <div className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-full">
        <div className="p-4 border-b border-dark-800">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-semibold text-white">Recent Media</h1>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-gray-500 hover:text-white hover:bg-dark-800 transition-colors"
                title="Close library"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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
              {libraries.map((anime, index) => {
                const tree = treesByAnimeId.get(anime.id)
                const hasSubFolders = (tree?.folders.size ?? 0) > 0
                const isTreeOpen = openAnimeId === anime.id
                const directCount = tree ? tree.episodes.length : anime.episodes.length

                return (
                  <div key={anime.id}>
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                        dragIndex === index ? 'opacity-50' : ''
                      } ${
                        dropTarget === index && dragIndex !== index
                          ? 'border-t-2 border-blue-400'
                          : ''
                      } ${
                        currentAnime?.id === anime.id && !selectedFolderKey
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-dark-800 text-gray-300'
                      }`}
                      onClick={() => handleSelectAnimeRoot(anime)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {/* Expand chevron — only shown when the anime folder has nested sub-folders.
                              Clicking anywhere on the row (including this icon) both opens this
                              folder's own direct videos and toggles the sub-folder list below. */}
                          {hasSubFolders ? (
                            <svg
                              className={`w-3.5 h-3.5 mt-1.5 flex-shrink-0 transition-transform ${
                                isTreeOpen ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <title>{isTreeOpen ? 'Collapse folders' : 'Expand folders'}</title>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          ) : (
                            <span className="w-4 flex-shrink-0" />
                          )}
                          <svg
                            className="w-8 h-8 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M2 6a2 2 0 012-2h6l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{anime.name}</h3>
                            <p
                              className={`text-sm mt-1 ${
                                currentAnime?.id === anime.id ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {hasSubFolders
                                ? `${tree!.folders.size} folder${tree!.folders.size > 1 ? 's' : ''}`
                                : `${directCount} episodes`}
                            </p>
                          </div>
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

                    {/* Nested sub-folders (e.g. Anime/Season 1/, Anime/Season 2/) —
                        folder names only; their videos load into the Episode List
                        only once clicked, never eagerly. */}
                    {isTreeOpen && tree && (
                      <div className="mt-0.5 mb-1">
                        <AnimeSubFolders
                          node={tree}
                          keyPrefix={anime.id}
                          path={[]}
                          depth={0}
                          expanded={expandedFolders}
                          toggleExpanded={toggleExpandedFolder}
                          selectedKey={selectedFolderKey}
                          onSelectFolder={(node, key, path) =>
                            handleSelectSubFolder(anime, node, key, path)
                          }
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}
