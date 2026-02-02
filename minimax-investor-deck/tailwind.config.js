/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Primary colors - Dark Sapphire Blue Theme
        'primary': {
          50: '#e8f4ff',
          100: '#cee8ff',
          200: '#9ed2ff',
          300: '#6eb8ff',
          400: '#4da3ff',
          500: '#3d8ae8',
          600: '#2f6fc7',
          700: '#1f3a5f',
          800: '#1a2f4a',
          900: '#0f1c2e',
          950: '#0a1220',
        },
        // Accent colors
        'accent': {
          50: '#f0f4fa',
          100: '#dde5f0',
          200: '#bccbe3',
          300: '#94b0d3',
          400: '#6d92c0',
          500: '#4d648d',
          600: '#3d5a80',
          700: '#2d4a6e',
          800: '#1e3a5f',
          900: '#0f2a4f',
          950: '#0a1a3f',
        },
        // Background colors
        'bg': {
          'base': '#0f1c2e',
          'card': '#1f3a5f',
          'elevated': '#2d4a6e',
        },
        // Text colors
        'text': {
          'primary': '#f0f8ff',
          'secondary': '#94b8e0',
          'muted': '#6d92c0',
        },
        // Border colors
        'border': {
          'default': '#4d648d',
          'subtle': '#1f3a5f',
        },
      },
    },
  },
  plugins: [],
}
