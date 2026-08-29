/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F3',
        ink: {
          DEFAULT: '#1C2331',
          muted: '#5B6472',
        },
        brass: {
          DEFAULT: '#A8763E',
          dark: '#8B5F30',
          light: '#F1E7D6',
        },
        hairline: '#E4E0D6',
        status: {
          success: '#3F7D58',
          successBg: '#E9F2EC',
          warning: '#B8863B',
          warningBg: '#F8F0E1',
          danger: '#A6432D',
          dangerBg: '#F5E8E4',
        },
      },
      fontFamily: {
        serif: ['"Lora"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '6px',
      },
    },
  },
  plugins: [],
};