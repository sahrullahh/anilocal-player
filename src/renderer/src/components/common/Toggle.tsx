type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name. Pass the id of a visible label via `labelledBy` instead when one exists. */
  label?: string
  labelledBy?: string
  disabled?: boolean
}

/**
 * Lifted from the two identical switches in SettingsModal.
 *
 * Height goes from 28px to 32px to meet the minimum target, and it gains
 * a focus ring plus `role="switch"` / `aria-checked`, none of which the
 * inline version had.
 */
export function Toggle({ checked, onChange, label, labelledBy, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full px-1',
        'transition-colors duration-base ease-standard focus-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-accent' : 'bg-surface-active'
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-6 w-6 rounded-full bg-content-on-accent',
          'transition-transform duration-base ease-standard',
          checked ? 'translate-x-6' : 'translate-x-0'
        ].join(' ')}
      />
    </button>
  )
}
