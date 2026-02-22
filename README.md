# 📚 BookShelf — Книжная полка

Telegram бот с Web App для управления коллекцией книг.

## ✨ Возможности

- 📖 Добавление книг с обложками и оценками
- 🎨 Визуальные полки по 4 книги в ряд
- 💫 Неоновая подсветка для книг с обложкой
- 📱 Telegram Web App — открывается прямо в Telegram
- 🔥 Firebase — данные не пропадут

## 🚀 Deploy

### 1. Railway (Бот)

```bash
git init
git add .
git commit -m "Initial commit"
git push -u origin main
```

Затем в Railway:
- New Project → Deploy from GitHub
- Добавь переменные:
  - `TELEGRAM_BOT_TOKEN`
  - `WEB_APP_URL=https://bookshelf-a70fd.web.app`

### 2. Firebase (Frontend)

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

## 📁 Структура

```
BookShelf/
├── bot/               # Telegram бот (aiogram3)
│   ├── main.py
│   └── requirements.txt
├── frontend/          # React Web App
│   ├── src/
│   └── dist/
├── Procfile           # Для Railway
└── requirements.txt   # Python зависимости
```

## 🔧 Локальный запуск

### Бот
```bash
cd bot
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📱 Ссылки

- **Bot:** @ShelfLibraryBot
- **Web App:** https://bookshelf-a70fd.web.app

## 🛠️ Технологии

- **Frontend:** React 18, TypeScript, Vite, Firebase SDK
- **Backend:** Firebase Firestore
- **Бот:** Python 3.9+, aiogram 3
- **Хостинг:** Firebase Hosting + Railway
