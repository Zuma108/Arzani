/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.ejs",
    "./public/**/*.js",
    "./public/**/*.css",
    "./routes/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        "appsintraai-inter-medium": ["Inter-Medium", "sans-serif"],
        "appsintraai-inter-regular": ["Inter-Regular", "sans-serif"],
        "appsintraai-semantic-link-underline": ["Inter-Regular", "sans-serif"],
        "appsintraai-semantic-label": ["SegoeUi-Regular", "sans-serif"],
        "appsintraai-semantic-input": ["SegoeUi-Regular", "sans-serif"],
        "appsintraai-semantic-options": ["SegoeUi-Regular", "sans-serif"],
        "appsintraai-inter-semi-bold": ["Inter-SemiBold", "sans-serif"],
        "appsintraai-semantic-button": ["Inter-Medium", "sans-serif"],
        "font-family-font-1": ["Inter-Medium", "sans-serif"],
        "font-family-font-2": ["SegoeUi-Regular", "sans-serif"],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        accent: '#8B5CF6',
        dark: '#1F2937',
        "appsintraai-black-80": "rgba(0, 0, 0, 0.80)",
        "appsintraai-confetti": "#f0d466",
        "appsintraai-white": "#ffffff",
        "appsintraai-white-20": "rgba(255, 255, 255, 0.20)",
        "appsintraai-black-20": "rgba(0, 0, 0, 0.20)",
        "appsintraai-royal-blue": "#2563eb",
        "appsintraai-black-70": "rgba(0, 0, 0, 0.70)",
        "appsintraai-woodsmoke": "#09090b",
        "appsintraai-tundora": "#404040",
        "appsintraai-black": "#000000",
        "appsintraai-black-50": "rgba(0, 0, 0, 0.50)",
        "color-white-solid": "#ffffff",
        "color-black-80": "rgba(0, 0, 0, 0.80)",
        "color-yellow-67": "#f0d466",
        "color-azure-60": "#3b82f6"
      },
      spacing: {
        'item-spacing-s': '24px',
        'item-spacing-xs': '8px',
        'item-spacing-l': '48px',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '12': '3rem',
        '14': '3.5rem',
        '16': '4rem'
      },
      fontSize: {
        "appsintraai-inter-medium": "16.734375px",
        "appsintraai-inter-regular": "12.90625px",
        "appsintraai-semantic-link": "12.796875px",
        "appsintraai-semantic-label": "14.899999618530273px",
        "appsintraai-semantic-input": "16px",
        "appsintraai-semantic-button": "14.75px",
        'sm': '0.875rem',
        'base': '1rem'
      },
      width: {
        '350px': '350px',
        '400px': '400px',
        '450px': '450px',
        'width-1280': '1280px',
        'width-512': '512px',
        'width-1920': '1920px'
      },
      height: {
        '400px': '400px',
        '450px': '450px',
        '500px': '500px',
        'height-147209': '1472.0899658203125px'
      },
      lineHeight: {
        "appsintraai-inter-medium": "18px",
        "appsintraai-inter-regular": "14px",
        "appsintraai-semantic-link": "14px",
        "appsintraai-semantic-label": "17.11px",
        "appsintraai-semantic-input": "normal",
        "appsintraai-semantic-button": "24px"
      },
      letterSpacing: {
        "letter-spacing-072": "-0.72px"
      }
    }
  },
  plugins: []
};

