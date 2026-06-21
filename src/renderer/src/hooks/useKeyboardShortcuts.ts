import { useEffect } from 'react'

type KeyboardActions = {
  togglePlay: () => void
  seek: (seconds: number) => void
  toggleFullscreen: () => void
  toggleMute: () => void
  nextEpisode: () => void
  skip: () => void
  /** T — cycle through subtitle tracks */
  cycleSubtitle: () => void
  /** Shift+T — turn off subtitles */
  disableSubtitle: () => void
}

export function useKeyboardShortcuts(actions: KeyboardActions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault()
          actions.togglePlay()
          break
        case 'arrowright':
          actions.seek(10)
          break
        case 'arrowleft':
          actions.seek(-10)
          break
        case 'f':
          actions.toggleFullscreen()
          break
        case 'm':
          actions.toggleMute()
          break
        case 'n':
          actions.nextEpisode()
          break
        case 's':
          actions.skip()
          break
        case 't':
          event.preventDefault()
          if (event.shiftKey) {
            actions.disableSubtitle()
          } else {
            actions.cycleSubtitle()
          }
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions])
}
