tailwind.config = {
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'] },
            colors: {
                primary: '#6d28d9', // Purple 700 (ดูเข้มข้น เป็นทางการ)
                'primary-light': '#ede9fe', // Purple 100
                secondary: '#8b5cf6', // Purple 500
                surface: '#f8fafc', // Slate 50
                background: '#f1f5f9' // Slate 100
            },
            boxShadow: {
                'soft': '0 2px 10px rgba(0, 0, 0, 0.02)',
                'hover-soft': '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
            }
        }
    }
}
