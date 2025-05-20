import plugin = require('tailwindcss/plugin')

const withOpacity = (variableName: string): (({ opacityValue }: { opacityValue: string }) => string) => {
  return ({ opacityValue }) => {
    if (opacityValue) {
      return `rgba(var(${variableName}) / ${opacityValue})`
    }
    return `rgba(var(${variableName}))`
  }
}

const tailwindConfig = {
  mode: 'jit',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  safelist: [
    { pattern: /(bg-primary-|bg-surface-)./ },
    { pattern: /(text-surface-|text-primary-)./ },
    { pattern: /(w-|h-)./ },
    { pattern: /(ring-error-)./ },
  ],
  theme: {
    extend: {
      fontFamily: {
        menu: ['Comfortaa', 'sans-serif'],
        content: ['Lato', 'sans-serif'],
        code: ['DM Mono', 'monospace'],
      },
      colors: {
        'primary-50': withOpacity('primary-50'),
        'primary-100': withOpacity('--primary-100'),
        'primary-200': withOpacity('--primary-200'),
        'primary-300': withOpacity('--primary-300'),
        'primary-400': withOpacity('--primary-400'),
        'primary-500': withOpacity('--primary-500'),
        'primary-600': withOpacity('--primary-600'),
        'primary-700': withOpacity('--primary-700'),
        'primary-800': withOpacity('--primary-800'),
        'primary-900': withOpacity('--primary-900'),
        'primary-950': withOpacity('--primary-950'),
        'surface-0': withOpacity('--surface-0'),
        'surface-50': withOpacity('--surface-50'),
        'surface-100': withOpacity('--surface-100'),
        'surface-200': withOpacity('--surface-200'),
        'surface-300': withOpacity('--surface-300'),
        'surface-400': withOpacity('--surface-400'),
        'surface-500': withOpacity('--surface-500'),
        'surface-600': withOpacity('--surface-600'),
        'surface-700': withOpacity('--surface-700'),
        'surface-800': withOpacity('--surface-800'),
        'surface-900': withOpacity('--surface-900'),
        'surface-950': withOpacity('--surface-950'),
        'error-50': withOpacity('--error-50'),
        'error-100': withOpacity('--error-100'),
        'error-200': withOpacity('--error-200'),
        'error-300': withOpacity('--error-300'),
        'error-400': withOpacity('--error-400'),
        'error-500': withOpacity('--error-500'),
        'error-600': withOpacity('--error-600'),
        'error-700': withOpacity('--error-700'),
        'error-800': withOpacity('--error-800'),
        'error-900': withOpacity('--error-900'),
        'error-950': withOpacity('--error-950'),
        'warn-50': withOpacity('--warn-50'),
        'warn-100': withOpacity('--warn-100'),
        'warn-200': withOpacity('--warn-200'),
        'warn-300': withOpacity('--warn-300'),
        'warn-400': withOpacity('--warn-400'),
        'warn-500': withOpacity('--warn-500'),
        'warn-600': withOpacity('--warn-600'),
        'warn-700': withOpacity('--warn-700'),
        'warn-800': withOpacity('--warn-800'),
        'warn-900': withOpacity('--warn-900'),
        'warn-950': withOpacity('--warn-950'),
        'info-50': withOpacity('--info-50'),
        'info-100': withOpacity('--info-100'),
        'info-200': withOpacity('--info-200'),
        'info-300': withOpacity('--info-300'),
        'info-400': withOpacity('--info-400'),
        'info-500': withOpacity('--info-500'),
        'info-600': withOpacity('--info-600'),
        'info-700': withOpacity('--info-700'),
        'info-800': withOpacity('--info-800'),
        'info-900': withOpacity('--info-900'),
        'info-950': withOpacity('--info-950'),
        'success-50': withOpacity('--success-50'),
        'success-100': withOpacity('--success-100'),
        'success-200': withOpacity('--success-200'),
        'success-300': withOpacity('--success-300'),
        'success-400': withOpacity('--success-400'),
        'success-500': withOpacity('--success-500'),
        'success-600': withOpacity('--success-600'),
        'success-700': withOpacity('--success-700'),
        'success-800': withOpacity('--success-800'),
        'success-900': withOpacity('--success-900'),
        'success-950': withOpacity('--success-950'),
        'nav-bar-500': withOpacity('--nav-500'),
        '--light-black-500': withOpacity('--light-black-500'),
        '--light-black-600': withOpacity('--light-black-600'),
      },
      keyframes: {
        'spin-up': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1', borderRadius: '0' },
          '100%': { transform: 'translateY(-1000px) rotate(720deg)', opacity: '0', borderRadius: '50%' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
      },
      animation: {
        'float-up': 'spin-up 25s linear infinite',
        shake: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
      },
    },
  },
  plugins: [
    // Animation Delay
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        {
          'animation-delay': (value) => {
            return {
              'animation-delay': value,
            }
          },
        },
        {
          values: theme('transitionDelay'),
        }
      )
    }),
    // Animation Duration
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          'animation-duration': (value) => ({
            animationDuration: value,
          }),
        },
        { values: theme('transitionDelay') }
      )
    }),
  ],
}

export default tailwindConfig
