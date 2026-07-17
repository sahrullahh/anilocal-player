import { useState, useCallback } from 'react'

type Props = {
  keyName: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  onChange: (key: string, ctrl: boolean, shift: boolean, alt: boolean) => void
}

export function KeybindInput({ keyName, ctrl, shift, alt, onChange }: Props) {
  const [listening, setListening] = useState(false)

  const handleClick = useCallback(() => {
    setListening(true)

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setListening(false)
        document.removeEventListener('keydown', handler, true)
        return
      }

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

      onChange(e.key, e.ctrlKey, e.shiftKey, e.altKey)
      setListening(false)
      document.removeEventListener('keydown', handler, true)
    }

    document.addEventListener('keydown', handler, true)
  }, [onChange])

  const display = [
    ctrl && 'Ctrl',
    shift && 'Shift',
    alt && 'Alt',
    keyName === ' ' ? 'Space' : keyName === 'ArrowRight' ? '→' : keyName === 'ArrowLeft' ? '←' : keyName
  ].filter(Boolean).join('+')

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`min-w-[100px] px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
        listening
          ? 'bg-blue-600 text-white border border-blue-500 animate-pulse'
          : 'bg-dark-800 text-gray-300 hover:bg-dark-700 border border-dark-700'
      }`}
    >
      {listening ? '...' : display}
    </button>
  )
}
