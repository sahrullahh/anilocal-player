import type { Subtitle } from '../../types/anime'

type SubtitleMenuProps = {
  subtitles: Subtitle[]
  selectedSubtitle: Subtitle | null
  onSelect: (subtitle: Subtitle | null) => void
}

const FORMAT_BADGE_COLORS: Record<string, string> = {
  '.ass': 'bg-purple-700 text-purple-100',
  '.ssa': 'bg-purple-600 text-purple-100',
  '.srt': 'bg-blue-700 text-blue-100',
  '.vtt': 'bg-teal-700 text-teal-100'
}

export function SubtitleMenu({ subtitles, selectedSubtitle, onSelect }: SubtitleMenuProps) {
  return (
    <div className="absolute bottom-16 right-4 bg-dark-800 rounded-lg shadow-lg overflow-hidden z-40 min-w-56">
      <div className="p-2 border-b border-dark-700">
        <p className="text-sm font-medium text-gray-300 px-2 py-1">Subtitles</p>
        <p className="text-xs text-gray-500 px-2 pb-1">
          T = cycle&nbsp;&nbsp;Shift+T = off
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {/* Off option */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
            selectedSubtitle === null ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-dark-700'
          }`}
        >
          <span className="flex-1">Off</span>
        </button>

        {subtitles.map((subtitle) => {
          const isActive = selectedSubtitle?.path === subtitle.path
          const badgeClass =
            FORMAT_BADGE_COLORS[subtitle.extension] ?? 'bg-gray-700 text-gray-200'

          return (
            <button
              key={subtitle.path}
              onClick={() => onSelect(subtitle)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-dark-700'
              }`}
              title={subtitle.path}
            >
              {/* Language label */}
              <span className="flex-1 truncate">{subtitle.language}</span>

              {/* Format badge */}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                  isActive ? 'bg-blue-500/50 text-blue-100' : badgeClass
                }`}
              >
                {subtitle.extension.replace('.', '')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
