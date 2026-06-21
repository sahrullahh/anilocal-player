import { Modal } from '../common/Modal'
import { useSettingsStore } from '../../store/settings.store'

const LANGUAGES = ['Indonesia', 'English', 'Japanese', 'Chinese', 'Arabic', 'Spanish', 'French', 'Portuguese', 'Unknown']
const FORMATS = ['.ass', '.ssa', '.srt', '.vtt']

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    autoplay,
    setAutoplay,
    volume,
    setVolume,
    preferredSubtitleLanguage,
    setPreferredSubtitleLanguage,
    preferredSubtitleFormat,
    setPreferredSubtitleFormat
  } = useSettingsStore()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">

        {/* ── Autoplay ── */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-dark-900 p-4 border border-dark-700">
          <div>
            <h3 className="text-white font-medium">Autoplay next episode</h3>
            <p className="text-sm text-gray-400 mt-1">
              Otomatis lanjut ke episode berikutnya setelah video selesai.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAutoplay(!autoplay)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              autoplay ? 'bg-blue-600' : 'bg-dark-600'
            }`}
            aria-pressed={autoplay}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                autoplay ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* ── Default volume ── */}
        <div className="rounded-xl bg-dark-900 p-4 border border-dark-700">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h3 className="text-white font-medium">Default volume</h3>
              <p className="text-sm text-gray-400 mt-1">Atur volume player default.</p>
            </div>
            <span className="text-sm text-gray-300 min-w-12 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        {/* ── Subtitle Preferences ── */}
        <div className="rounded-xl bg-dark-900 p-4 border border-dark-700 space-y-4">
          <div>
            <h3 className="text-white font-medium">Subtitle Preferences</h3>
            <p className="text-sm text-gray-400 mt-1">
              Pilihan ini digunakan saat player memilih subtitle otomatis untuk episode baru.
            </p>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Language
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setPreferredSubtitleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    preferredSubtitleLanguage === lang
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-800 text-gray-300 hover:bg-dark-700 border border-dark-700'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Format */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Format
            </label>
            <div className="flex gap-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setPreferredSubtitleFormat(fmt)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium uppercase transition-colors ${
                    preferredSubtitleFormat === fmt
                      ? 'bg-purple-700 text-purple-100'
                      : 'bg-dark-800 text-gray-300 hover:bg-dark-700 border border-dark-700'
                  }`}
                >
                  {fmt.replace('.', '')}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ASS &gt; SSA &gt; SRT &gt; VTT (urutan prioritas default untuk fansub)
            </p>
          </div>
        </div>

      </div>
    </Modal>
  )
}
