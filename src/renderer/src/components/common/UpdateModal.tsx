import { useEffect, useState } from 'react'
import { useUpdateStore } from '../../store/update.store'

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** GitHub release notes may arrive as HTML — strip tags for readable plain text. */
function cleanReleaseNotes(raw: string): string {
  return raw
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Interactive update popup shown when a new version is detected on startup.
 * Lets the user choose to update now or later, tracks download progress,
 * and offers a restart-to-install action once the download completes.
 *
 * Unlike UpdateToast (a passive, auto-dismissing notification), this modal
 * requires a user decision and drives the full download → install flow so the
 * user never has to open Settings.
 */
export function UpdateModal(): React.JSX.Element | null {
  const status = useUpdateStore((s) => s.status)
  const info = useUpdateStore((s) => s.info)
  const progress = useUpdateStore((s) => s.progress)
  const error = useUpdateStore((s) => s.error)
  const appVersion = useUpdateStore((s) => s.appVersion)
  const downloadUpdate = useUpdateStore((s) => s.downloadUpdate)
  const installUpdate = useUpdateStore((s) => s.installUpdate)
  const cancelDownload = useUpdateStore((s) => s.cancelDownload)

  // "Nanti" hides the popup; "engaged" keeps it open through the download flow
  const [dismissed, setDismissed] = useState(false)
  const [engaged, setEngaged] = useState(false)

  // Re-show once whenever a *new* version is detected
  useEffect(() => {
    if (info?.version) {
      setDismissed(false)
      setEngaged(false)
    }
  }, [info?.version])

  const visible =
    (!dismissed && status === 'available') ||
    (engaged && (status === 'downloading' || status === 'downloaded' || status === 'error'))

  if (!visible || !info) return null

  const notes = info.releaseNotes ? cleanReleaseNotes(info.releaseNotes) : ''
  const isDownloading = status === 'downloading'

  const handleUpdate = (): void => {
    setEngaged(true)
    void downloadUpdate()
  }
  const handleLater = (): void => {
    setDismissed(true)
  }
  const handleCancel = (): void => {
    void cancelDownload()
    setEngaged(false)
    setDismissed(true)
  }
  const handleInstall = (): void => {
    void installUpdate()
  }
  const handleRetry = (): void => {
    void downloadUpdate()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isDownloading ? undefined : handleLater}
      />

      <div className="relative bg-dark-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slideUp border border-dark-700">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">
              {status === 'downloaded' ? 'Update Siap Dipasang' : 'Update Tersedia'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appVersion && (
                <span className="text-gray-500">v{appVersion} </span>
              )}
              <span className="text-gray-500">→ </span>
              <span className="font-medium text-blue-400">v{info.version}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-2">
          {/* Release notes */}
          {notes && status === 'available' && (
            <div className="rounded-xl bg-dark-900 border border-dark-700 p-3 mb-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">
                Yang Baru
              </p>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed">
                {notes}
              </pre>
            </div>
          )}

          {/* Download progress */}
          {isDownloading && (
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Mengunduh update…</span>
                <span>{Math.round(progress?.percent ?? 0)}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
              {progress && (
                <p className="text-[11px] text-gray-500">
                  {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
                  {progress.bytesPerSecond > 0 && (
                    <span> · {formatBytes(progress.bytesPerSecond)}/s</span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Downloaded */}
          {status === 'downloaded' && (
            <p className="text-sm text-gray-300 mb-3">
              Update sudah diunduh. Aplikasi perlu dimulai ulang untuk memasang versi baru.
            </p>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="rounded-xl bg-red-900/20 border border-red-800/40 p-3 mb-3">
              <p className="text-sm font-medium text-red-400">Gagal mengunduh update</p>
              {error && <p className="text-xs text-red-300/80 mt-1 break-words">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          {status === 'available' && (
            <>
              <button
                type="button"
                onClick={handleLater}
                className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-dark-700 transition-colors"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                Update Sekarang
              </button>
            </>
          )}

          {isDownloading && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-dark-700 hover:text-red-400 transition-colors"
            >
              Batalkan
            </button>
          )}

          {status === 'downloaded' && (
            <>
              <button
                type="button"
                onClick={handleLater}
                className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-dark-700 transition-colors"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={handleInstall}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors"
              >
                Restart &amp; Pasang
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <button
                type="button"
                onClick={handleLater}
                className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-dark-700 transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                Coba Lagi
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
