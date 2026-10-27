/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                canvas: '#F4F6FA',
                card: '#FFFFFF',
                brand: {
                    blue: '#2272FF',
                    'blue-light': '#60A5FA',
                    purple: '#A82FFC',
                    'purple-light': '#C084FC',
                    pink: '#EC3882',
                    'pink-light': '#F472B6',
                    amber: '#EA8D15',
                    'amber-light': '#FBBF24',
                    emerald: '#10B981',
                    rose: '#EF4444',
                },
                upn: {
                    50: '#eef5ff',
                    100: '#d9e8ff',
                    200: '#bcd7ff',
                    300: '#8ebeff',
                    400: '#599bff',
                    500: '#3378ff',
                    600: '#2272ff',
                    700: '#1958db',
                    800: '#1a48b0',
                    900: '#1b3f8b',
                },
                ilinyx: {
                    50: '#eef5ff',
                    100: '#d9e8ff',
                    200: '#bcd7ff',
                    300: '#8ebeff',
                    400: '#599bff',
                    500: '#3378ff',
                    600: '#2272ff',
                    700: '#2272ff',
                    800: '#1958db',
                    900: '#071630',
                },
            },
            borderRadius: {
                '3xl': '24px',
                '4xl': '28px',
            },
            boxShadow: {
                soft: '0 10px 30px -4px rgba(15, 23, 42, 0.04)',
                'soft-card': '0 8px 24px -2px rgba(15, 23, 42, 0.035)',
                'soft-hover': '0 16px 36px -4px rgba(15, 23, 42, 0.07)',
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
