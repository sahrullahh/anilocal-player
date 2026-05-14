import type { Subtitle } from '../../types/anime'

type SubtitleMenuProps = {
  subtitles: Subtitle[]
  selectedSubtitle: Subtitle | null
  onSelect: (subtitle: Subtitle | null) => void
}

export function SubtitleMenu({ subtitles, selectedSubtitle, onSelect }: SubtitleMenuProps) {
  return (
    <div className="absolute bottom-16 right-4 bg-dark-800 rounded-lg shadow-lg overflow-hidden z-40 min-w-48">
      <div className="p-2 border-b border-dark-700">
        <p className="text-sm font-medium text-gray-300 px-2 py-1">Subtitles</p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
            selectedSubtitle === null ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-dark-700'
          }`}
        >
          Off
        </button>
        {subtitles.map((subtitle) => (
          <button
            key={subtitle.path}
            onClick={() => onSelect(subtitle)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors truncate ${
              selectedSubtitle?.path === subtitle.path
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-dark-700'
            }`}
            title={subtitle.label}
          >
            {subtitle.label}
          </button>
        ))}
      </div>
    </div>
  )
}
