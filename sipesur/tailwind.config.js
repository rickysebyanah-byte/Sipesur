/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Abu-abu dengan sedikit hijau, supaya serasi dengan warna utama.
        slate: {
          50: '#f7f8f5',
          100: '#eef0eb',
          200: '#dfe3dc',
          300: '#c9cfc5',
          400: '#a2aa9e',
          500: '#79836f',
          600: '#576053',
          700: '#3f473c',
          800: '#2b322a',
          900: '#1d231d',
          950: '#111611',
        },
        // Hijau tua, warna utama aplikasi.
        brand: {
          50: '#edf5f0',
          100: '#d7e8de',
          200: '#b0d0bf',
          300: '#82b09a',
          400: '#4f8b72',
          500: '#2f7059',
          600: '#235e49',
          700: '#1c4d3d',
          800: '#153d30',
          900: '#0f2e24',
        },
        // Merah cap kantor. Dipakai hanya untuk penanda surat terbit dan jumlah belum dibaca.
        cap: '#a5332a',
        navy: { DEFAULT: '#1d231d', dark: '#111611', light: '#2b322a' },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        serif: ['Literata', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        md: '0.25rem',
        lg: '0.25rem',
        xl: '0.3rem',
        '2xl': '0.375rem',
      },
    },
  },
};
