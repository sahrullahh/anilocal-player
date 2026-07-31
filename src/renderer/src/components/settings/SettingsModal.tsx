import { useState } from 'react'
import { Modal } from '../common/Modal'
import { KeybindInput } from './KeybindInput'
import { useSettingsStore, KEYBIND_LABELS } from '../../store/settings.store'
import { UpdatePanel } from './UpdatePanel'
import type { KeybindAction } from '../../store/settings.store'

const LANGUAGES = [
  'Indonesia',
  'English',
  'Japanese',
  'Chinese',
  'Arabic',
  'Spanish',
  'French',
  'Portuguese',
  'Unknown'
]
const FORMATS = ['.ass', '.ssa', '.srt', '.vtt']

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'general' | 'shortcuts' | 'application'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('general')
  const {
    autoplay,
    setAutoplay,
    autoSkipIntroOutro,
    setAutoSkipIntroOutro,
    volume,
    setVolume,
    theme,
    setTheme,
    preferredSubtitleLanguage,
    setPreferredSubtitleLanguage,
    preferredSubtitleFormat,
    setPreferredSubtitleFormat,
    keybinds,
    setKeybind,
    resetAllKeybinds
  } = useSettingsStore()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-dark-800 pb-0">
        {(
          [
            ['general', 'General'],
            ['shortcuts', 'Shortcuts'],
            ['application', 'Application']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === key
                ? 'bg-dark-900 text-white border border-dark-800 border-b-dark-900 -mb-[1px]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-6">
          {/* Theme */}
          <div className="rounded-xl bg-dark-900 p-4 border border-dark-700">
            <div className="mb-3">
              <h3 className="text-white font-medium">Theme</h3>
              <p className="text-sm text-gray-400 mt-1">Pilih tema tampilan aplikasi.</p>
            </div>
            <div className="flex gap-2">
              {(
                [
                  ['slate', 'Beta'],
                  ['neutral', 'Dark'],
                  ['light', 'Light']
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    theme === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-800 text-gray-300 hover:bg-dark-700 border border-dark-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Autoplay */}
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

          {/* Auto Skip Intro/Outro */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-dark-900 p-4 border border-dark-700">
            <div>
              <h3 className="text-white font-medium">Auto skip intro / outro</h3>
              <p className="text-sm text-gray-400 mt-1">
                Otomatis lewati bagian intro dan outro tanpa perlu klik tombol skip.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoSkipIntroOutro(!autoSkipIntroOutro)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                autoSkipIntroOutro ? 'bg-blue-600' : 'bg-dark-600'
              }`}
              aria-pressed={autoSkipIntroOutro}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  autoSkipIntroOutro ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Default volume */}
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
              aria-label="Default volume"
              // Feeds the filled portion of the track.
              style={{ ['--range-fill' as string]: `${volume * 100}%` }}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Subtitle Preferences */}
          <div className="rounded-xl bg-dark-900 p-4 border border-dark-700 space-y-4">
            <div>
              <h3 className="text-white font-medium">Subtitle Preferences</h3>
              <p className="text-sm text-gray-400 mt-1">
                Pilihan ini digunakan saat player memilih subtitle otomatis untuk episode baru.
              </p>
            </div>

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
      )}

      {tab === 'shortcuts' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Klik tombol keybind lalu tekan kombinasi yang diinginkan. ESC untuk batal.
          </p>

          <div className="space-y-2">
            {(Object.keys(KEYBIND_LABELS) as KeybindAction[]).map((action) => {
              const kb = keybinds[action]
              return (
                <div
                  key={action}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-dark-900 border border-dark-800"
                >
                  <span className="text-sm text-gray-300">{KEYBIND_LABELS[action]}</span>
                  <KeybindInput
                    keyName={kb.key}
                    ctrl={kb.ctrl}
                    shift={kb.shift}
                    alt={kb.alt}
                    onChange={(key, ctrl, shift, alt) =>
                      setKeybind(action, { key, ctrl, shift, alt })
                    }
                  />
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={resetAllKeybinds}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      )}

      {tab === 'application' && (
        <div className="space-y-6">
          <UpdatePanel />
        </div>
      )}
    </Modal>
  )
}
 