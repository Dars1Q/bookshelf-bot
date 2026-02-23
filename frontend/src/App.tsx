import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { firebaseConfig } from './firebase';
import { useTranslation } from './hooks/useTranslation';
import './App.css';

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type BookStatus = 'reading' | 'want_to_read' | 'completed';

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  rating: number | null;
  cycle: string | null;
  number: string | null;
  status: BookStatus;
}

interface BookFormData {
  title: string;
  author: string;
  description: string;
  cover_url: string;
  rating: number | null;
  cycle: string;
  number: string;
  status: BookStatus;
}

const initialFormData: BookFormData = {
  title: '',
  author: '',
  description: '',
  cover_url: '',
  rating: null,
  cycle: '',
  number: '',
  status: 'reading',
};

const BOOKS_PER_SHELF = 4;

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<BookFormData>(initialFormData);
  const [telegramId, setTelegramId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
  const [activeTab, setActiveTab] = useState<BookStatus>('reading');
  const { t, lang, changeLanguage } = useTranslation();

  // Инициализация Telegram Web App
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();

    // Получаем Telegram ID из URL параметра (передается ботом)
    const urlParams = new URLSearchParams(window.location.search);
    const urlTgId = urlParams.get('tg_id');

    const user = WebApp.initDataUnsafe?.user;
    
    // Приоритет: 1) URL параметр от бота, 2) Telegram Web App data, 3) localStorage
    if (urlTgId) {
      // Бот передал ID в URL - используем его
      const tgId = `tg_${urlTgId}`;
      setTelegramId(tgId);
      localStorage.setItem('telegram_id', tgId);
      console.log('Telegram ID из URL:', tgId);
    } else if (user?.id) {
      // Открыто в Telegram но без URL параметра
      const tgId = `tg_${user.id}`;
      setTelegramId(tgId);
      localStorage.setItem('telegram_id', tgId);
      console.log('Telegram ID из WebApp:', tgId);
      
      const username = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
      if (username) {
        localStorage.setItem('telegram_username', username);
      }
    } else {
      // Открыто в браузере - берем из localStorage
      const storedId = localStorage.getItem('telegram_id');
      if (storedId) {
        setTelegramId(storedId);
        console.log('Telegram ID из localStorage:', storedId);
      } else {
        // Первый запуск в браузере - создаем временный ID
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        setTelegramId(id);
        localStorage.setItem('telegram_id', id);
        console.log('Временный ID:', id);
      }
    }
  }, []);

  // Загрузка книг
  useEffect(() => {
    if (telegramId) {
      fetchBooks();
    }
  }, [telegramId]);

  // Настройка MainButton - скрываем так как есть кнопка в приложении
  useEffect(() => {
    if (!telegramId) return;

    // Скрываем MainButton чтобы не дублировать кнопку в приложении
    WebApp.MainButton.hide();
  }, [telegramId]);

  const fetchBooks = async () => {
    if (!telegramId) {
      console.log('Нет telegramId, пропускаем загрузку');
      setLoading(false);
      return;
    }

    try {
      console.log('Загружаем книги для пользователя:', telegramId);
      const booksRef = collection(db, 'users', telegramId, 'books');
      const q = query(booksRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);

      const booksData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Миграция: если нет статуса, ставим 'reading' по умолчанию
        if (!data.status) {
          data.status = 'reading';
        }
        return {
          id: doc.id,
          ...data
        };
      }) as Book[];

      console.log('Загружено книг:', booksData.length);
      setBooks(booksData);
    } catch (error) {
      console.error('Ошибка загрузки книг:', error);
      alert('Ошибка загрузки данных! Проверь консоль (F12)');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const booksRef = collection(db, 'users', telegramId, 'books');

      if (editingBook) {
        const bookRef = doc(db, 'users', telegramId, 'books', editingBook.id);
        await updateDoc(bookRef, {
          title: formData.title,
          author: formData.author || null,
          description: formData.description || null,
          cover_url: formData.cover_url || null,
          rating: formData.rating || null,
          cycle: formData.cycle || null,
          number: formData.number || null,
          status: formData.status,
        });
      } else {
        await addDoc(booksRef, {
          title: formData.title,
          author: formData.author || null,
          description: formData.description || null,
          cover_url: formData.cover_url || null,
          rating: formData.rating || null,
          cycle: formData.cycle || null,
          number: formData.number || null,
          status: formData.status,
          created_at: Timestamp.now(),
        });
      }

      fetchBooks();
      setFormData(initialFormData);
      setShowForm(false);
      setEditingBook(null);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения! Проверь настройки Firebase.');
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author || '',
      description: book.description || '',
      cover_url: book.cover_url || '',
      rating: book.rating,
      cycle: book.cycle || '',
      number: book.number?.toString() || '',
      status: book.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.bookInfo.confirmDelete)) return;

    try {
      const bookRef = doc(db, 'users', telegramId, 'books', id);
      await deleteDoc(bookRef);
      fetchBooks();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const renderStars = (rating: number | null, interactive = false) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`star ${rating && star <= rating ? '' : 'empty'}`}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
        onClick={() => interactive && setFormData({ ...formData, rating: star === formData.rating ? null : star })}
      >
        {star <= (rating || 0) ? '★' : '☆'}
      </span>
    ));
  };

  // Фильтрация книг по активному статусу
  const filteredBooks = books.filter(book => book.status === activeTab);

  // Разбиваем книги на полки
  const shelves: Book[][] = [];
  for (let i = 0; i < filteredBooks.length; i += BOOKS_PER_SHELF) {
    shelves.push(filteredBooks.slice(i, i + BOOKS_PER_SHELF));
  }

  const tabLabels: Record<BookStatus, { label: string; icon: string }> = {
    reading: { label: t.tabs.reading.label, icon: t.tabs.reading.icon },
    want_to_read: { label: t.tabs.want_to_read.label, icon: t.tabs.want_to_read.icon },
    completed: { label: t.tabs.completed.label, icon: t.tabs.completed.icon },
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner">📚</div>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1><span>📚</span> <span className="title-text">{t.title}</span></h1>
        <p>{t.subtitle}</p>

        {/* Переключатель языка */}
        <button
          className="language-toggle"
          onClick={() => setShowLanguageSwitcher(!showLanguageSwitcher)}
          title="Выбрать язык"
        >
          🌐 {lang.toUpperCase()}
        </button>

        <div className={`language-switcher ${showLanguageSwitcher ? 'visible' : ''}`}>
          <button
            className={lang === 'ru' ? 'active' : ''}
            onClick={() => changeLanguage('ru')}
          >
            RU
          </button>
          <button
            className={lang === 'en' ? 'active' : ''}
            onClick={() => changeLanguage('en')}
          >
            EN
          </button>
          <button
            className={lang === 'uk' ? 'active' : ''}
            onClick={() => changeLanguage('uk')}
          >
            UK
          </button>
        </div>
      </header>

      {/* Переключатель статусов (табы) */}
      <div className="status-tabs">
        {(Object.keys(tabLabels) as BookStatus[]).map((status) => (
          <button
            key={status}
            className={`status-tab ${activeTab === status ? 'active' : ''}`}
            onClick={() => setActiveTab(status)}
          >
            <span className="status-tab-icon">{tabLabels[status].icon}</span>
            <span className="status-tab-label">{tabLabels[status].label}</span>
          </button>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBook ? t.form.editTitle : t.form.newTitle}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.form.labels.title}</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t.form.placeholders.title}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t.form.labels.author}</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder={t.form.placeholders.author}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t.form.labels.cover}</label>
                <input
                  type="url"
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                  placeholder={t.form.placeholders.cover}
                />
              </div>

              <div className="form-group">
                <label>{t.form.labels.description}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.form.placeholders.description}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t.form.labels.cycle}</label>
                  <input
                    type="text"
                    value={formData.cycle}
                    onChange={(e) => setFormData({ ...formData, cycle: e.target.value })}
                    placeholder={t.form.placeholders.cycle}
                  />
                </div>

                <div className="form-group">
                  <label>{t.form.labels.number}</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="1 или 3.5"
                    pattern="[0-9]*[.,]?[0-9]*"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t.form.labels.status}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as BookStatus })}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    background: '#ffffff0d',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="reading">{t.tabs.reading.icon} {t.tabs.reading.label}</option>
                  <option value="want_to_read">{t.tabs.want_to_read.icon} {t.tabs.want_to_read.label}</option>
                  <option value="completed">{t.tabs.completed.icon} {t.tabs.completed.label}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t.form.labels.rating}</label>
                <div className="rating-input">
                  {renderStars(formData.rating, true)}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowForm(false);
                    setEditingBook(null);
                    setFormData(initialFormData);
                  }}
                >
                  {t.form.cancel}
                </button>
                <button type="submit" className="btn-primary">
                  {editingBook ? t.form.save : t.form.add}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <h3>{t.emptyState.title}</h3>
          <p>{t.emptyState.description}</p>
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
            style={{
              marginTop: '20px',
              padding: '16px 32px',
              fontSize: '1.1rem'
            }}
          >
            {t.emptyState.button}
          </button>
        </div>
      ) : (
        <div className="shelves-container">
          {shelves.map((shelfBooks, shelfIndex) => {
            const emptySlotsCount = BOOKS_PER_SHELF - shelfBooks.length;
            
            return (
              <div key={shelfIndex} className="shelf-row">
                <div className="shelf">
                  <div className="shelf-bracket left"></div>
                  
                  {shelfBooks.map((book) => (
                    <div 
                      key={book.id} 
                      className={`book-on-shelf ${book.cover_url ? 'has-cover' : ''}`}
                    >
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="book-cover" />
                      ) : (
                        <div className="book-cover-placeholder">📕</div>
                      )}
                      
                      <div className="book-info">
                        <div
                          className="book-info-header"
                          onClick={(e) => {
                            e.stopPropagation();
                            const info = (e.target as HTMLElement).closest('.book-info');
                            info?.classList.toggle('book-info-expanded');
                          }}
                        >
                          {book.rating && (
                            <div className="book-info-rating">
                              {renderStars(book.rating)}
                            </div>
                          )}
                          <span className="book-info-toggle">▼</span>
                        </div>
                        <div className="book-info-content">
                          <div className="book-info-title">{book.title}</div>
                          {book.author && <div className="book-info-author">{book.author}</div>}
                          {(book.cycle || book.number) && (
                            <div className="book-info-cycle" style={{ marginTop: '6px', fontSize: '0.75rem', color: '#ffd700' }}>
                              {book.cycle && <span>{book.cycle}</span>}
                              {book.cycle && book.number && <span> • </span>}
                              {book.number && <span>№{book.number}</span>}
                            </div>
                          )}
                          {book.description && (
                            <div className="book-info-description" style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.9 }}>
                              {book.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="book-actions-overlay">
                        <button 
                          className="btn-icon btn-edit-icon" 
                          onClick={() => handleEdit(book)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon btn-delete-icon" 
                          onClick={() => handleDelete(book.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}

                  {shelfIndex === shelves.length - 1 && emptySlotsCount > 0 && (
                    <>
                      {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                        <div
                          key={idx}
                          className="book-slot empty"
                          onClick={() => setShowForm(true)}
                        >
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '10px' }}>
                            {t.shelf.emptySlot}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="shelf-bracket right"></div>
                </div>
              </div>
            );
          })}

          {/* Большая кнопка добавления книги */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              className="btn-primary"
              onClick={() => setShowForm(true)}
              style={{
                padding: '20px 40px',
                fontSize: '1.2rem',
                margin: '0 auto'
              }}
            >
              {t.addButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
