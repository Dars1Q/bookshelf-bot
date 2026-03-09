# 📚 BookShelf — Книжная полка

Telegram бот с Web App для управления коллекцией книг.

## ✨ Возможности

- 📖 Добавление книг с обложками и оценками
- 🎨 Визуальные полки по 4 книги в ряд
- 💫 Неоновая подсветка для книг с обложкой
- 📱 Telegram Web App — открывается прямо в Telegram
- 🔥 Firebase — данные не пропадут

## 🚀 Deploy

### 1. GitHub Actions (Бот) — бесплатно и автономно

Бот работает через GitHub Actions и не требует Railway или других хостингов.

**Настройка:**

1. Открой репозиторий на GitHub → Settings → Secrets and variables → Actions

2. Добавь два секрета:
   - `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather
   - `WEB_APP_URL` — URL веб-приложения (например, `https://bookshelf-a70fd.web.app`)

3. Запуш изменения в main/master ветку:
```bash
git add .
git commit -m "Setup GitHub Actions bot"
git push -u origin main
```

4. Workflow автоматически запустится. Проверь: Actions → Telegram Bot

> **Примечание:** Для публичных репозиториев GitHub Actions бесплатен без ограничений.

### 2. Firebase (Frontend)

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

## 📁 Структура

```
BookShelf/
├── bot/                   # Telegram бот (aiogram3)
│   ├── main.py
│   ├── locales.py
│   └── requirements.txt
├── frontend/              # React Web App
│   ├── src/
│   └── dist/
├── .github/workflows/     # GitHub Actions для бота
│   └── bot.yml
├── .firebaserc            # Firebase проект
├── firebase.json          # Firebase конфиг
└── requirements.txt       # Python зависимости
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
- **Бот:** Python 3.9+, aiogram 3, Firebase Admin SDK
- **Хостинг:** Firebase Hosting + GitHub Actions
