/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palet warna PHP iconic Purple-Indigo (#4F5B93 · #777BB4 · #8892BF)
        slate: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
        brand: {
          50:  '#f1f2f9',
          100: '#e4e7f4',
          200: '#c9cfe9',
          300: '#a4aed9',
          400: '#7a88c6',
          500: '#5d6db6',
          600: '#4d5ca4',
          700: '#4f5b93', // Iconic PHP Primary Blue-Purple
          800: '#3f4874',
          900: '#373c5d',
          950: '#1e2033',
        },
        php: {
          light:   '#8892BF',
          DEFAULT: '#777BB4',
          medium:  '#4F5B93',
          dark:    '#373C59',
          darker:  '#1E2130',
        },
        // Stempel & cap kelurahan
        cap: '#a5332a',
        navy: { DEFAULT: '#373C59', dark: '#1E2130', light: '#4F5B93' },
        // Indigo untuk aksen sekunder
        indigo: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
        violet: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
          400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
          800: '#5b21b6', 900: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        serif: ['Literata', 'Georgia', 'serif'],
        mono: ['"Fira Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        php: '0 4px 14px 0 rgba(79, 91, 147, 0.15)',
        'php-md': '0 6px 20px -2px rgba(79, 91, 147, 0.2), 0 2px 6px -1px rgba(79, 91, 147, 0.08)',
        'php-lg': '0 10px 30px -3px rgba(79, 91, 147, 0.22), 0 4px 8px -2px rgba(79, 91, 147, 0.08)',
      },
      ringWidth: {
        3: '3px',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'php-gradient': 'linear-gradient(135deg, #4F5B93 0%, #6366f1 100%)',
        'php-gradient-dark': 'linear-gradient(135deg, #373C59 0%, #4F5B93 100%)',
      },
    },
  },
};
