# Локализация для бота

LOCALES = {
    'ru': {
        'start': {
            'text': (
                "👋 Привет! Я бот для ведения книжной полки.\n\n"
                "📝 Я помогу тебе:\n"
                "• Добавлять книги с обложкой и описанием\n"
                "• Ставить оценки прочитанным книгам\n"
                "• Хранить свою коллекцию\n\n"
                "📲 Нажми кнопку ниже или меню слева!"
            ),
            'buttons': {
                'shelf': '📚 Открыть полку',
                'add': '➕ Добавить книгу',
                'help': 'ℹ️ Помощь'
            }
        },
        'shelf': {
            'text': '📖 Твоя книжная полка:',
            'button': '📚 Открыть полку'
        },
        'help': {
            'text': (
                "📚 Книжная полка - бот для учёта книг\n\n"
                "Команды:\n"
                "/start - Запустить бота\n"
                "/books - Показать мои книги\n"
                "/add - Добавить книгу\n\n"
                "📲 Веб-версия: нажми '📚 Открыть полку'\n\n"
                "Данные хранятся в Firebase и не пропадут!"
            )
        },
        'add_book': {
            'title': '📖 Введите название книги:',
            'author': '✍️ Введите имя автора (или /skip):',
            'description': '📝 Введите описание книги (или /skip):',
            'cover': '🖼️ Отправьте URL обложки (или /skip):',
            'rating': '⭐ Поставьте оценку (1-5):',
            'skip': '/skip',
            'added': '✅ Книга добавлена!'
        },
        'rating': {
            'skip': '⏭ Пропустить',
            'answer': 'Оценка: '
        },
        'menu_button': '📚 Моя полка'
    },
    'en': {
        'start': {
            'text': (
                "👋 Hello! I'm your BookShelf bot.\n\n"
                "📝 I can help you:\n"
                "• Add books with covers and descriptions\n"
                "• Rate books you've read\n"
                "• Keep your collection organized\n\n"
                "📲 Tap the button below or menu on the left!"
            ),
            'buttons': {
                'shelf': '📚 Open Shelf',
                'add': '➕ Add Book',
                'help': 'ℹ️ Help'
            }
        },
        'shelf': {
            'text': '📖 Your book shelf:',
            'button': '📚 Open Shelf'
        },
        'help': {
            'text': (
                "📚 BookShelf - book tracking bot\n\n"
                "Commands:\n"
                "/start - Start the bot\n"
                "/books - Show my books\n"
                "/add - Add a book\n\n"
                "📲 Web version: tap '📚 Open Shelf'\n\n"
                "Data is stored in Firebase and won't be lost!"
            )
        },
        'add_book': {
            'title': '📖 Enter book title:',
            'author': '✍️ Enter author name (or /skip):',
            'description': '📝 Enter description (or /skip):',
            'cover': '🖼️ Send cover URL (or /skip):',
            'rating': '⭐ Rate the book (1-5):',
            'skip': '/skip',
            'added': '✅ Book added!'
        },
        'rating': {
            'skip': '⏭ Skip',
            'answer': 'Rating: '
        },
        'menu_button': '📚 My Shelf'
    },
    'uk': {
        'start': {
            'text': (
                "👋 Привіт! Я бот для ведення книжкової полиці.\n\n"
                "📝 Я допоможу тобі:\n"
                "• Додавати книги з обкладинками та описом\n"
                "• Ставити оцінки прочитаним книгам\n"
                "• Зберігати свою колекцію\n\n"
                "📲 Натисни кнопку нижче або меню зліва!"
            ),
            'buttons': {
                'shelf': '📚 Відкрити полицю',
                'add': '➕ Додати книгу',
                'help': 'ℹ️ Допомога'
            }
        },
        'shelf': {
            'text': '📖 Твоя книжкова полиця:',
            'button': '📚 Відкрити полицю'
        },
        'help': {
            'text': (
                "📚 Книжкова полиця - бот для обліку книг\n\n"
                "Команди:\n"
                "/start - Запустити бота\n"
                "/books - Показати мої книги\n"
                "/add - Додати книгу\n\n"
                "📲 Веб-версія: натисни '📚 Відкрити полицю'\n\n"
                "Дані зберігаються в Firebase і не пропадуть!"
            )
        },
        'add_book': {
            'title': '📖 Введіть назву книги:',
            'author': "✍️ Введіть ім'я автора (або /skip):",
            'description': '📝 Введіть опис (або /skip):',
            'cover': '🖼️ Надішліть URL обкладинки (або /skip):',
            'rating': '⭐ Поставте оцінку (1-5):',
            'skip': '/skip',
            'added': '✅ Книгу додано!'
        },
        'rating': {
            'skip': '⏭ Пропустити',
            'answer': 'Оцінка: '
        },
        'menu_button': '📚 Моя полиця'
    }
}

def get_locale(language_code: str) -> dict:
    """Отримати локалізацію за кодом мови"""
    if not language_code:
        return LOCALES['ru']
    
    lang = language_code.split('-')[0]  # 'ru' from 'ru-RU'
    
    if lang in LOCALES:
        return LOCALES[lang]
    
    # Fallback на русский для славянских языков
    if lang in ['be', 'bg', 'sr', 'mk']:
        return LOCALES['ru']
    
    # Default на английский
    return LOCALES['en']
