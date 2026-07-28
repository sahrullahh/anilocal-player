/**
 * BufferingSpinner — circular progress overlay shown when the video is
 * loading or stalled (buffering). Uses a pure CSS animated SVG circle,
 * no external dependency required.
 */

type BufferingSpinnerProps = {
  visible: boolean
}

export function BufferingSpinner({ visible }: BufferingSpinnerProps) {
  if (!visible) return null

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
      aria-label="Buffering"
      role="status"
    >
      {/* Subtle dark backdrop just behind the spinner */}
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Backdrop circle */}
        <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-sm" />

        {/* SVG spinner */}
        <svg
          className="relative w-12 h-12 -rotate-90"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          {/* Track ring */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="3.5"
            fill="none"
          />
          {/* Animated arc */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="white"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="125.66"   /* 2π × 20 */
            strokeDashoffset="94.25"   /* 75% of circumference = visible arc */
            style={{
              animation: 'anilocal-spin 0.9s linear infinite',
              transformOrigin: 'center'
            }}
          />
        </svg>
      </div>
    </div>
  )
}
