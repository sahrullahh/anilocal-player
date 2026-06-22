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

const EMBEDDED_BADGE_CLASS = 'bg-green-700 text-green-100'

/** Sort so embedded tracks appear before external/internal tracks. */
function sortSubtitles(subtitles: Subtitle[]): Subtitle[] {
  return [...subtitles].sort((a, b) => {
    const aEmbedded = a.source === 'embedded' ? 0 : 1
    const bEmbedded = b.source === 'embedded' ? 0 : 1
    return aEmbedded - bEmbedded
  })
}

/** Derive a stable React key for a subtitle entry. */
function subtitleKey(subtitle: Subtitle): string {
  if (subtitle.source === 'embedded') {
    return `embedded:${subtitle.trackIndex}`
  }
  return subtitle.path
}

export function SubtitleMenu({ subtitles, selectedSubtitle, onSelect }: SubtitleMenuProps) {
  const sortedSubtitles = sortSubtitles(subtitles)

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

        {sortedSubtitles.map((subtitle) => {
          const isEmbedded = subtitle.source === 'embedded'
          const isActive = selectedSubtitle
            ? isEmbedded
              ? selectedSubtitle.source === 'embedded' &&
                selectedSubtitle.trackIndex === subtitle.trackIndex
              : selectedSubtitle.path === subtitle.path
            : false
          const formatBadgeClass =
            FORMAT_BADGE_COLORS[subtitle.extension] ?? 'bg-gray-700 text-gray-200'

          return (
            <button
              key={subtitleKey(subtitle)}
              onClick={() => onSelect(subtitle)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-dark-700'
              }`}
              title={subtitle.label}
            >
              {/* Language / display label */}
              <span className="flex-1 truncate">{subtitle.label}</span>

              {/* EMBEDDED badge for embedded tracks */}
              {isEmbedded && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                    isActive ? 'bg-blue-500/50 text-blue-100' : EMBEDDED_BADGE_CLASS
                  }`}
                >
                  EMBEDDED
                </span>
              )}

              {/* Format badge */}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                  isActive ? 'bg-blue-500/50 text-blue-100' : formatBadgeClass
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
