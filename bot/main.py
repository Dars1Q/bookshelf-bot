import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, MenuButtonWebApp
from dotenv import load_dotenv
import os

# Загрузка переменных окружения
load_dotenv()

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://bookshelf-a70fd.web.app')

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Главное меню
main_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text='📚 Открыть полку', web_app=WebAppInfo(url=WEB_APP_URL))],
        [KeyboardButton(text='➕ Добавить книгу'), KeyboardButton(text='ℹ️ Помощь')],
    ],
    resize_keyboard=True
)

# Обработчик /start
@dp.message(Command('start'))
async def cmd_start(message: types.Message):
    await message.answer(
        f"👋 Привет! Я бот для ведения книжной полки.\n\n"
        f"📝 Я помогу тебе:\n"
        f"• Добавлять книги с обложкой и описанием\n"
        f"• Ставить оценки прочитанным книгам\n"
        f"• Хранить свою коллекцию\n\n"
        f"📲 Нажми кнопку ниже или меню слева!",
        reply_markup=main_keyboard
    )

# Обработчик кнопки "Открыть полку"
@dp.message(lambda msg: msg.text == '📚 Открыть полку')
async def open_webapp(message: types.Message):
    await message.answer(
        f'📖 Твоя книжная полка:\n\n🔗 {WEB_APP_URL}',
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[[
                InlineKeyboardButton(text='📚 Открыть полку', web_app=WebAppInfo(url=WEB_APP_URL))
            ]]
        )
    )

# Обработчик кнопки "Добавить книгу"
@dp.message(lambda msg: msg.text == '➕ Добавить книгу')
async def add_book_start(message: types.Message):
    await message.answer('📖 Введите название книги:')
    await dp.storage.set_state(message.from_user.id, 'add_book_title')

# Обработчик кнопки "Помощь"
@dp.message(lambda msg: msg.text == 'ℹ️ Помощь')
async def help_command(message: types.Message):
    await message.answer(
        "📚 Книжная полка - бот для учёта книг\n\n"
        "Команды:\n"
        "/start - Запустить бота\n"
        "/books - Показать мои книги\n"
        "/add - Добавить книгу\n\n"
        "📲 Веб-версия: нажми '📚 Открыть полку'\n\n"
        "Данные хранятся в Firebase и не пропадут!"
    )

# Обработчик состояния добавления книги
@dp.message(lambda msg: msg.text and msg.text.startswith('/'))
async def skip_command(message: types.Message):
    if message.text == '/skip':
        state = await dp.storage.get_state(message.from_user.id)
        if state == 'add_book_title':
            await message.answer('✍️ Введите имя автора (или /skip):')
            await dp.storage.set_state(message.from_user.id, 'add_book_author')
        elif state == 'add_book_author':
            await message.answer('📝 Введите описание книги (или /skip):')
            await dp.storage.set_state(message.from_user.id, 'add_book_description')
        elif state == 'add_book_description':
            await message.answer('🖼️ Отправьте URL обложки (или /skip):')
            await dp.storage.set_state(message.from_user.id, 'add_book_cover')
        elif state == 'add_book_cover':
            await show_rating_keyboard(message)

async def show_rating_keyboard(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text='1️⃣', callback_data='rate_1'),
                InlineKeyboardButton(text='2️⃣', callback_data='rate_2'),
                InlineKeyboardButton(text='3️⃣', callback_data='rate_3'),
            ],
            [
                InlineKeyboardButton(text='4️⃣', callback_data='rate_4'),
                InlineKeyboardButton(text='5️⃣', callback_data='rate_5'),
            ],
            [InlineKeyboardButton(text='⏭ Пропустить', callback_data='rate_skip')],
        ]
    )
    await message.answer('⭐ Поставьте оценку (1-5):', reply_markup=keyboard)
    await dp.storage.set_state(message.from_user.id, 'add_book_rating')

# Обработчик оценок
@dp.callback_query(lambda c: c.data.startswith('rate_'))
async def process_rating(callback_query: types.CallbackQuery):
    rating = callback_query.data.split('_')[1]
    await callback_query.answer(f'Оценка: {rating}')
    await callback_query.message.answer('✅ Книга добавлена!', reply_markup=main_keyboard)
    await dp.storage.clear_state(callback_query.from_user.id)

# Запуск
async def main():
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        
        # Устанавливаем кнопку меню
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                type='web_app',
                text='📚 Моя полка',
                web_app=WebAppInfo(url=WEB_APP_URL)
            )
        )
        
        logging.info('Бот запущен...')
        logging.info(f'Web App URL: {WEB_APP_URL}')
        await dp.start_polling(bot)
    except Exception as e:
        logging.error(f'Ошибка запуска бота: {e}')

if __name__ == '__main__':
    asyncio.run(main())
