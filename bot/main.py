import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, MenuButtonWebApp
from dotenv import load_dotenv
import os
from locales import get_locale

# Загрузка переменных окружения
load_dotenv()

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://bookshelf-a70fd.web.app')
WEB_APP_VERSION = 'v24'  # Меняем при обновлении для сброса кэша Telegram

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Обработчик /start
@dp.message(Command('start'))
async def cmd_start(message: types.Message):
    # Определяем язык из Telegram
    lang_code = message.from_user.language_code if message.from_user else 'ru'
    loc = get_locale(lang_code)
    
    # Передаем Telegram ID в URL для главной кнопки
    web_app_url = f"{WEB_APP_URL}?tg_id={message.from_user.id}&v={WEB_APP_VERSION}"
    
    main_keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=loc['start']['buttons']['shelf'], web_app=WebAppInfo(url=web_app_url))],
            [KeyboardButton(text=loc['start']['buttons']['add']), KeyboardButton(text=loc['start']['buttons']['help'])],
        ],
        resize_keyboard=True
    )
    
    await message.answer(
        loc['start']['text'],
        reply_markup=main_keyboard
    )

# Обработчик кнопки "Открыть полку"
@dp.message(lambda msg: msg.text and msg.text in ['📚 Открыть полку', '📚 Open Shelf', '📚 Відкрити полицю'])
async def open_webapp(message: types.Message):
    lang_code = message.from_user.language_code if message.from_user else 'ru'
    loc = get_locale(lang_code)
    web_app_url = f"{WEB_APP_URL}?tg_id={message.from_user.id}&v={WEB_APP_VERSION}"
    
    await message.answer(
        loc['shelf']['text'],
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[[
                InlineKeyboardButton(text=loc['shelf']['button'], web_app=WebAppInfo(url=web_app_url))
            ]]
        )
    )

# Обработчик кнопки "Добавить книгу"
@dp.message(lambda msg: msg.text and msg.text in ['➕ Добавить книгу', '➕ Add Book', '➕ Додати книгу'])
async def add_book_start(message: types.Message):
    lang_code = message.from_user.language_code if message.from_user else 'ru'
    loc = get_locale(lang_code)
    
    await message.answer(loc['add_book']['title'])
    await dp.storage.set_state(message.from_user.id, 'add_book_title')

# Обработчик кнопки "Помощь"
@dp.message(lambda msg: msg.text and msg.text in ['ℹ️ Помощь', 'ℹ️ Help', 'ℹ️ Допомога'])
async def help_command(message: types.Message):
    lang_code = message.from_user.language_code if message.from_user else 'ru'
    loc = get_locale(lang_code)
    
    await message.answer(loc['help']['text'])

# Обработчик состояния добавления книги
@dp.message(lambda msg: msg.text and msg.text.startswith('/'))
async def skip_command(message: types.Message):
    if message.text == '/skip':
        lang_code = message.from_user.language_code if message.from_user else 'ru'
        loc = get_locale(lang_code)
        
        state = await dp.storage.get_state(message.from_user.id)
        if state == 'add_book_title':
            await message.answer(loc['add_book']['author'])
            await dp.storage.set_state(message.from_user.id, 'add_book_author')
        elif state == 'add_book_author':
            await message.answer(loc['add_book']['description'])
            await dp.storage.set_state(message.from_user.id, 'add_book_description')
        elif state == 'add_book_description':
            await message.answer(loc['add_book']['cover'])
            await dp.storage.set_state(message.from_user.id, 'add_book_cover')
        elif state == 'add_book_cover':
            await show_rating_keyboard(message, loc)

async def show_rating_keyboard(message: types.Message, loc: dict):
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
            [InlineKeyboardButton(text=loc['rating']['skip'], callback_data='rate_skip')],
        ]
    )
    await message.answer(loc['add_book']['rating'], reply_markup=keyboard)
    await dp.storage.set_state(message.from_user.id, 'add_book_rating')

# Обработчик оценок
@dp.callback_query(lambda c: c.data.startswith('rate_'))
async def process_rating(callback_query: types.CallbackQuery):
    lang_code = callback_query.from_user.language_code if callback_query.from_user else 'ru'
    loc = get_locale(lang_code)
    
    rating = callback_query.data.split('_')[1]
    await callback_query.answer(f"{loc['rating']['answer']}{rating}")
    await callback_query.message.answer(loc['add_book']['added'])
    
    # Возвращаем главное меню с правильным языком
    web_app_url = f"{WEB_APP_URL}?tg_id={callback_query.from_user.id}&v={WEB_APP_VERSION}"
    main_keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=loc['start']['buttons']['shelf'], web_app=WebAppInfo(url=web_app_url))],
            [KeyboardButton(text=loc['start']['buttons']['add']), KeyboardButton(text=loc['start']['buttons']['help'])],
        ],
        resize_keyboard=True
    )
    await callback_query.message.answer(loc['start']['text'], reply_markup=main_keyboard)
    await dp.storage.clear_state(callback_query.from_user.id)

# Запуск
async def main():
    try:
        await bot.delete_webhook(drop_pending_updates=True)

        # Устанавливаем кнопку меню на английском (универсальный)
        # Индивидуальная локализация работает через кнопки в чате
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                type='web_app',
                text='📚 Open Shelf',  # Универсальный текст
                web_app=WebAppInfo(url=f"{WEB_APP_URL}?v={WEB_APP_VERSION}")
            )
        )

        logging.info('Бот запущен...')
        logging.info(f'Web App URL: {WEB_APP_URL}')
        logging.info('Localization: RU, EN, UA')
        logging.info('Menu Button: 📚 Open Shelf (global)')
        await dp.start_polling(bot)
    except Exception as e:
        logging.error(f'Ошибка запуска бота: {e}')

if __name__ == '__main__':
    asyncio.run(main())
