/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#131e36',
          950: '#060a17',
        },
      },
      fontFamily: {
        pixel: ['Trebuchet MS', 'Segoe UI', 'system-ui', 'sans-serif'],
        pixelHeading: ['Trebuchet MS', 'Segoe UI', 'system-ui', 'sans-serif'],
        retro: ['Trebuchet MS', 'Segoe UI', 'system-ui', 'sans-serif'],
        terminal: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};