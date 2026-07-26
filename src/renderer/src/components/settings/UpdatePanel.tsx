import { useUpdateStore, type UpdateChannel } from '../../store/update.store'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Status badge shown next to the section title */
function StatusBadge() {
  const status = useUpdateStore((s) => s.status)
  const error = useUpdateStore((s) => s.error)

  const config: Record<string, { label: string; color: string }> = {
    idle:          { label: '', color: '' },
    checking:      { label: 'Checking...', color: 'text-gray-400' },
    available:     { label: 'Update available', color: 'text-green-400' },
    'not-available': { label: 'Up to date', color: 'text-gray-500' },
    downloading:   { label: 'Downloading...', color: 'text-blue-400' },
    downloaded:    { label: 'Restart required', color: 'text-yellow-400' },
    error:         { label: error ?? 'Error', color: 'text-red-400' }
  }

  const c = config[status]
  if (!c?.label) return null

  return <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>
}

export function UpdatePanel() {
  const {
    status,
    info,
    progress,
    channel,
    appVersion,
    setChannel,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    cancelDownload,
    installLocalPackage
  } = useUpdateStore()

  const isIdle = status === 'idle' || status === 'not-available' || status === 'error'
  const isChecking = status === 'checking'
  const isAvailable = status === 'available'
  const isDownloading = status === 'downloading'
  const isDownloaded = status === 'downloaded'

  return (
    <div className="rounded-xl bg-dark-900 p-4 border border-dark-700 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Application Update</h3>
          <p className="text-xs text-gray-500 mt-0.5">Version {appVersion}</p>
        </div>
        <StatusBadge />
      </div>

      {/* Update channel */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Update Channel</p>
        <div className="flex gap-2">
          {(['stable', 'beta'] as UpdateChannel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                channel === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-dark-800 text-gray-300 hover:bg-dark-700 border border-dark-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Update info card */}
      {info && (isAvailable || isDownloading || isDownloaded) && (
        <div className="bg-dark-800 rounded-lg px-3 py-2 border border-dark-700">
          <p className="text-xs text-gray-500">New version</p>
          <p className="text-sm font-semibold text-white">{info.version}</p>
          {info.releaseNotes && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-3">{info.releaseNotes}</p>
          )}
        </div>
      )}

      {/* Download progress */}
      {isDownloading && progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatBytes(progress.bytesPerSecond)}/s</span>
            <span>{Math.round(progress.percent)}%</span>
          </div>
          <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Check for updates */}
        {isIdle && (
          <button
            type="button"
            onClick={() => checkForUpdates('github')}
            disabled={isChecking}
            className="px-3 py-1.5 text-xs rounded-lg bg-dark-800 border border-dark-600 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            Check for Updates
          </button>
        )}

        {/* Download */}
        {isAvailable && (
          <button
            type="button"
            onClick={downloadUpdate}
            className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Download Update
          </button>
        )}

        {/* Cancel */}
        {isDownloading && (
          <button
            type="button"
            onClick={cancelDownload}
            className="px-3 py-1.5 text-xs rounded-lg bg-dark-800 border border-dark-600 text-gray-300 hover:text-red-400 transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Install (restart) */}
        {isDownloaded && (
          <button
            type="button"
            onClick={installUpdate}
            className="px-3 py-1.5 text-xs rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors"
          >
            Restart & Install
          </button>
        )}

        {/* Install local package */}
        {isIdle && (
          <button
            type="button"
            onClick={installLocalPackage}
            className="px-3 py-1.5 text-xs rounded-lg bg-dark-800 border border-dark-600 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            Install Local Package...
          </button>
        )}
      </div>
    </div>
  )
}
