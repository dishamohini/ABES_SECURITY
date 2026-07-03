/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#bbdeff',
          300: '#7ec2ff',
          400: '#38a1ff',
          500: '#0d85ff',
          600: '#0066cc',
          700: '#004da3',
          800: '#014285',
          900: '#06376d',
          950: '#04234a',
        },
        darkBg: '#0f172a',
        darkCard: '#1e293b',
        darkBorder: '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        glow: '0 0 15px rgba(13, 133, 255, 0.4)',
      },
    },
  },
  plugins: [],
}
