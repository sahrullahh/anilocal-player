import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useUpdateStore } from '../../store/update.store'
import appLogo from '../../assets/app_logo.png'

/**
 * Help → About. Reads the version from the updater IPC that the app already
 * calls at startup, so there is no second source of truth for it.
 */
export function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const storeVersion = useUpdateStore((s) => s.appVersion)
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates)
  const [version, setVersion] = useState(storeVersion ?? '')

  // The store is populated at startup, but fall back to asking directly in case
  // this dialog is opened before that resolves.
  useEffect(() => {
    if (storeVersion) {
      setVersion(storeVersion)
      return
    }
    if (!isOpen) return
    window.api.updater
      .getVersion()
      .then(setVersion)
      .catch(() => undefined)
  }, [isOpen, storeVersion])

  const rows: Array<[string, string]> = [
    ['Version', version || '—'],
    ['Author', 'Mohammad Sahrullah'],
    ['Playback', 'HTML5 video'],
    ['Subtitles', 'libass (WebAssembly) · ASS / SSA / SRT / VTT'],
    ['Media tooling', 'ffmpeg · ffprobe'],
    ['Runtime', 'Electron · React · Zustand']
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <img
            src={appLogo}
            alt=""
            draggable={false}
            className="h-16 w-16 shrink-0 select-none object-contain"
          />
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-white">AniLocal Player</h3>
            <p className="mt-1 text-sm text-gray-400">
              Local anime player with intro/outro skipping, embedded subtitle support and progress
              tracking. Everything stays on your machine.
            </p>
          </div>
        </div>

        <dl className="divide-y divide-dark-700 rounded-xl bg-dark-900">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-6 px-4 py-2.5">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="min-w-0 text-right text-sm text-gray-200">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => void checkForUpdates('github').catch(console.error)}
          >
            Check for Updates
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
