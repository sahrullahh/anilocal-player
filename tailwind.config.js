/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Ultrawide tier. The rest use Tailwind's defaults (xl = 1280px,
        // 2xl = 1536px).
        '3xl': '2560px'
      },
      fontFamily: {
        sans: [
          'Outfit',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          'sans-serif'
        ]
      },
      // ── Typography scale ──────────────────────────────────────────
      // Replaces the ad-hoc mix of text-xs / text-sm / text-lg and the
      // arbitrary text-[10px] / text-[11px] values. Floor is 12px: any
      // text carrying information must be readable.
      fontSize: {
        display: ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }], // 24px
        title: ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }], // 18px
        subtitle: ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '500' }], // 15px
        body: ['0.875rem', { lineHeight: '1.3125rem', fontWeight: '400' }], // 14px
        label: ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }], // 13px
        caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }] // 12px
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      boxShadow: {
        raised: 'var(--shadow-raised)',
        overlay: 'var(--shadow-overlay)'
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)'
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        out: 'var(--ease-out)'
      },
      colors: {
        // ── Semantic tokens ─────────────────────────────────────────
        // The only colours components are allowed to reference.
        surface: {
          base: 'var(--surface-base)',
          sunken: 'var(--surface-sunken)',
          DEFAULT: 'var(--surface-default)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)'
        },
        content: {
          primary: 'var(--content-primary)',
          secondary: 'var(--content-secondary)',
          tertiary: 'var(--content-tertiary)',
          muted: 'var(--content-muted)',
          disabled: 'var(--content-disabled)',
          'on-accent': 'var(--content-on-accent)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          content: 'var(--accent-content)',
          subtle: 'var(--accent-subtle)'
        },
        status: {
          success: 'var(--status-success)',
          'success-surface': 'var(--status-success-surface)',
          warning: 'var(--status-warning)',
          'warning-surface': 'var(--status-warning-surface)',
          danger: 'var(--status-danger)',
          'danger-surface': 'var(--status-danger-surface)',
          info: 'var(--status-info)',
          neutral: 'var(--status-neutral)'
        },
        line: {
          subtle: 'var(--line-subtle)',
          strong: 'var(--line-strong)'
        },
        focus: 'var(--focus-ring)',
        // Fixed in every theme — for controls sitting on top of video.
        video: {
          'scrim-top': 'var(--video-scrim-top)',
          'scrim-bottom': 'var(--video-scrim-bottom)',
          surface: 'var(--video-surface)',
          'control-hover': 'var(--video-control-hover)',
          'control-active': 'var(--video-control-active)',
          content: 'var(--video-content)',
          'content-muted': 'var(--video-content-muted)',
          track: 'var(--video-track)',
          'track-buffered': 'var(--video-track-buffered)'
        },

        // ── Legacy aliases ──────────────────────────────────────────
        // Kept so components that have not been migrated yet keep
        // working. `dark-*` is really the neutral ramp and `blue-*` is
        // really the accent ramp; prefer the semantic tokens above.
        dark: {
          50: 'var(--c-50)',
          100: 'var(--c-100)',
          200: 'var(--c-200)',
          300: 'var(--c-300)',
          400: 'var(--c-400)',
          500: 'var(--c-500)',
          600: 'var(--c-600)',
          700: 'var(--c-700)',
          800: 'var(--c-800)',
          900: 'var(--c-900)',
          950: 'var(--c-950)'
        },
        blue: {
          50: 'var(--p-50)',
          100: 'var(--p-100)',
          200: 'var(--p-200)',
          300: 'var(--p-300)',
          400: 'var(--p-400)',
          500: 'var(--p-500)',
          600: 'var(--p-600)',
          700: 'var(--p-700)',
          800: 'var(--p-800)',
          900: 'var(--p-900)',
          950: 'var(--p-950)'
        }
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: []
}
