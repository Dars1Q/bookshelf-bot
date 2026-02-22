# 📚 BookShelf Bot

Telegram бот для управления книжной полкой с Web App.

## 🚀 Deploy на Railway

1. **Загрузи на GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

2. **Подключи Railway:**
   - Открой https://railway.app
   - New Project → Deploy from GitHub
   - Выбери репозиторий

3. **Добавь переменные:**
   - `TELEGRAM_BOT_TOKEN` — токен от @BotFather
   - `WEB_APP_URL` — URL веб-приложения (https://bookshelf-a70fd.web.app)

4. **Deploy!**

## 📁 Структура

```
BookShelf/
├── bot/               # Telegram бот (aiogram3)
│   ├── main.py        # Основной код
│   └── requirements.txt
├── frontend/          # React Web App
│   └── dist/          # Build для Firebase
├── Procfile           # Для Railway
├── requirements.txt   # Python зависимости
└── README.md
```

## 🔧 Локальный запуск

### Бот
```bash
cd bot
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📱 Bot

@ShelfLibraryBot в Telegram

## 🔥 Web App

https://bookshelf-a70fd.web.app
