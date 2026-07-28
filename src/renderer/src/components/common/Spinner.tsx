type SpinnerProps = {
  /** Diameter class, e.g. `w-12 h-12`. */
  className?: string
}

/**
 * Lifted from BufferingSpinner. Two changes: `stroke="white"` and
 * `rgba(255,255,255,0.15)` become `currentColor`, so the spinner
 * follows its context, and the `@keyframes anilocal-spin` definition
 * now lives in main.css instead of being injected via a <style> tag on
 * every mount.
 */
export function Spinner({ className = 'w-12 h-12' }: SpinnerProps) {
  return (
    <svg className={`${className} -rotate-90`} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3.5"
        fill="none"
      />
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="125.66" /* 2π × 20 */
        strokeDashoffset="94.25" /* 75% of circumference = visible arc */
        style={{ animation: 'anilocal-spin 0.9s linear infinite', transformOrigin: 'center' }}
      />
    </svg>
  )
}
