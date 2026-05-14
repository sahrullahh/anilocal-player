import { Modal } from '../common/Modal'
import { useSettingsStore } from '../../store/settings.store'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { autoplay, setAutoplay, volume, setVolume } = useSettingsStore()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">
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
      </div>
    </Modal>
  )
}
