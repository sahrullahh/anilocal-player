import { Button } from '../common/Button'
import type { SkipTimestamps } from '../../types/anime'

type SkipOverlayProps = {
  currentTime: number
  skipData?: SkipTimestamps
  onSkip: (time: number) => void
}

export function SkipOverlay({ currentTime, skipData, onSkip }: SkipOverlayProps) {
  const showSkipIntro =
    skipData?.introStart !== undefined &&
    skipData.introEnd !== undefined &&
    currentTime >= skipData.introStart &&
    currentTime < skipData.introEnd

  const showSkipOutro =
    skipData?.outroStart !== undefined &&
    skipData.outroEnd !== undefined &&
    currentTime >= skipData.outroStart &&
    currentTime < skipData.outroEnd

  if (!showSkipIntro && !showSkipOutro) return null

  return (
    <div className="absolute bottom-32 left-4 flex gap-2 z-40">
      {showSkipIntro && (
        <Button
          onClick={() => onSkip(skipData!.introEnd!)}
          variant="primary"
          size="sm"
          className="animate-slideUp"
        >
          Skip Intro
        </Button>
      )}
      {showSkipOutro && (
        <Button
          onClick={() => onSkip(skipData!.outroEnd!)}
          variant="primary"
          size="sm"
          className="animate-slideUp"
        >
          Skip Outro
        </Button>
      )}
    </div>
  )
}
