import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../store/settings.store'
import type { KeybindAction, Keybind } from '../store/settings.store'

type KeyboardActions = {
  togglePlay: () => void
  seek: (seconds: number) => void
  toggleFullscreen: () => void
  toggleMute: () => void
  nextEpisode: () => void
  skip: () => void
  cycleSubtitle: () => void
  disableSubtitle: () => void
  toggleLibrary: () => void
  toggleEpisodes: () => void
}

function matchesKeybind(event: KeyboardEvent, kb: Keybind): boolean {
  // Space bar
  if (kb.key === ' ' && event.key === ' ') {
    return event.ctrlKey === kb.ctrl && event.shiftKey === kb.shift && event.altKey === kb.alt
  }
  if (kb.key.toLowerCase() !== event.key.toLowerCase()) return false
  return event.ctrlKey === kb.ctrl && event.shiftKey === kb.shift && event.altKey === kb.alt
}

export function useKeyboardShortcuts(actions: KeyboardActions) {
  const actionsRef = useRef(actions)
  useEffect(() => { actionsRef.current = actions }, [actions])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const keybinds = useSettingsStore.getState().keybinds

      for (const [actionKey, kb] of Object.entries(keybinds) as [KeybindAction, Keybind][]) {
        if (!matchesKeybind(event, kb)) continue

        event.preventDefault()
        switch (actionKey) {
          case 'togglePlay': actionsRef.current.togglePlay(); return
          case 'seekForward': actionsRef.current.seek(10); return
          case 'seekBackward': actionsRef.current.seek(-10); return
          case 'toggleFullscreen': actionsRef.current.toggleFullscreen(); return
          case 'toggleMute': actionsRef.current.toggleMute(); return
          case 'nextEpisode': actionsRef.current.nextEpisode(); return
          case 'skipIntroOutro': actionsRef.current.skip(); return
          case 'cycleSubtitle': actionsRef.current.cycleSubtitle(); return
          case 'disableSubtitle': actionsRef.current.disableSubtitle(); return
          case 'toggleLibrary': actionsRef.current.toggleLibrary(); return
          case 'toggleEpisodes': actionsRef.current.toggleEpisodes(); return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
