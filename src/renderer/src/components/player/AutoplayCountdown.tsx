import { Button } from '../common/Button'

type AutoplayCountdownProps = {
  countdown: number | null
  onCancel: () => void
}

export function AutoplayCountdown({ countdown, onCancel }: AutoplayCountdownProps) {
  if (countdown === null) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 rounded-lg">
      <div className="text-center">
        <p className="text-white text-lg mb-4">
          Playing next episode in{' '}
          <span className="text-3xl font-bold text-blue-400">{countdown}</span>
        </p>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
