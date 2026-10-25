/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        rb: {
          50: '#fff1f2',
          100: '#ffe0e3',
          500: '#e11d2e',
          600: '#c8102e',
          700: '#a10b24',
          900: '#5c0614'
        }
      },
      fontFamily: {
        head: ['"Noto Serif Bengali"', 'serif'],
        body: ['"Hind Siliguri"', 'sans-serif']
      }
    }
  },
  plugins: []
};
