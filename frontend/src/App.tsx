import { useState, useEffect, useMemo } from 'react';
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

type BookStatus = 'reading' | 'want_to_read' | 'completed' | 'tracker';

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
  created_at?: any;
  completed_date?: string | null;
  genre?: string | null;
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
  completed_date: string;
  genre: string;
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
  completed_date: '',
  genre: '',
};

const BOOKS_PER_SHELF = 4;

// Компонент трекера прочитанных книг
interface TrackerViewProps {
  trackerData: {
    monthCounts: number[];
    maxCount: number;
    total: number;
    bestMonth: string;
    bestCount: number;
    availableYears: number[];
  };
  selectedYear: number;
  onYearChange: (year: number) => void;
  t: any;
}

function TrackerView({ trackerData, selectedYear, onYearChange, t }: TrackerViewProps) {
  const { monthCounts, maxCount, total, bestMonth, bestCount, availableYears } = trackerData;

  // Преобразуем локализованные названия месяцев в массив
  const monthsObj = t.tracker?.months || {};
  const localizedMonths = [
    monthsObj.jan || 'Янв', monthsObj.feb || 'Фев', monthsObj.mar || 'Мар',
    monthsObj.apr || 'Апр', monthsObj.may || 'Май', monthsObj.jun || 'Июн',
    monthsObj.jul || 'Июл', monthsObj.aug || 'Авг', monthsObj.sep || 'Сен',
    monthsObj.oct || 'Окт', monthsObj.nov || 'Ноя', monthsObj.dec || 'Дек'
  ];

  return (
    <div className="tracker-content">
      <div className="tracker-header">
        <h2>📊 {t.tracker?.title || 'Трекер прочитанного'}</h2>
        {availableYears.length > 0 && (
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="year-selector"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
      </div>

      {total === 0 ? (
        <div className="tracker-empty">
          <div className="tracker-empty-icon">📚</div>
          <p>{(t.tracker?.stats?.noBooks || 'В {year} году ещё не было прочитано книг').replace('{year}', selectedYear.toString())}</p>
        </div>
      ) : (
        <>
          <div className="chart-container">
            <div className="chart-bars">
              {monthCounts.map((count, idx) => (
                <div key={idx} className="chart-bar-wrapper">
                  <div
                    className={`chart-bar ${count > 0 ? 'has-value' : ''}`}
                    style={{
                      '--bar-height': count,
                      '--max-height': maxCount
                    } as React.CSSProperties}
                  >
                    {count > 0 && <span className="chart-value">{count}</span>}
                  </div>
                  <span className="chart-label">{localizedMonths[idx]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tracker-stats-below">
            <div className="stat-card stat-card-small">
              <span className="stat-value">{total}</span>
              <span className="stat-label">{t.tracker?.stats?.booksThisYear || 'книг за год'}</span>
            </div>
            {bestMonth && (
              <div className="stat-card stat-card-small">
                <span className="stat-value">{bestMonth}</span>
                <span className="stat-label">{t.tracker?.stats?.bestMonth || 'лучший месяц'} ({bestCount})</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<BookFormData>(initialFormData);
  const [telegramId, setTelegramId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
  const [activeTab, setActiveTab] = useState<BookStatus>('reading');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
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
          completed_date: formData.status === 'completed' ? (formData.completed_date || new Date().toISOString().split('T')[0]) : null,
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
          completed_date: formData.status === 'completed' ? (formData.completed_date || new Date().toISOString().split('T')[0]) : null,
          genre: formData.genre || null,
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
      completed_date: book.completed_date || '',
      genre: book.genre || '',
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

  // Трекер: подсчёт книг по месяцам для выбранного года
  const trackerData = useMemo(() => {
    const completedBooks = books.filter(book => book.status === 'completed');
    const monthCounts = Array(12).fill(0);
    let total = 0;

    console.log('Tracker: всего прочитано книг:', completedBooks.length);
    console.log('Tracker: выбранный год:', selectedYear);

    completedBooks.forEach(book => {
      // Используем completed_date если есть, иначе created_at
      let date: Date | null = null;

      if (book.completed_date) {
        date = new Date(book.completed_date);
        console.log(`Книга "${book.title}": completed_date = ${book.completed_date}`);
      } else if (book.created_at) {
        // @ts-ignore
        const createdAt = book.created_at?.toDate?.() || book.created_at;
        if (createdAt instanceof Date) {
          date = createdAt;
          console.log(`Книга "${book.title}": created_at = ${createdAt}`);
        }
      }

      if (date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        console.log(`  -> год: ${year}, месяц: ${month}`);
        if (year === selectedYear) {
          monthCounts[month]++;
          total++;
        }
      }
    });

    console.log('Tracker: monthCounts:', monthCounts);
    console.log('Tracker: total:', total);

    const maxCount = Math.max(...monthCounts, 1);

    // Найти лучший месяц
    let bestMonthIndex = -1;
    let bestCount = 0;
    monthCounts.forEach((count, idx) => {
      if (count > bestCount) {
        bestCount = count;
        bestMonthIndex = idx;
      }
    });

    // Получаем название лучшего месяца из локализации
    const monthNames = t.tracker?.months || [
      'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
      'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
    ];
    const bestMonth = bestMonthIndex >= 0 ? monthNames[bestMonthIndex] : '';

    // Доступные годы
    const availableYears = Array.from(new Set(
      completedBooks
        .map(b => {
          if (b.completed_date) {
            return new Date(b.completed_date).getFullYear();
          } else if (b.created_at) {
            // @ts-ignore
            const createdAt = b.created_at?.toDate?.() || b.created_at;
            if (createdAt instanceof Date) {
              return createdAt.getFullYear();
            }
          }
          return null;
        })
        .filter((year): year is number => year !== null)
    )).sort((a, b) => b - a);

    return { monthCounts, maxCount, total, bestMonth, bestCount, availableYears };
  }, [books, selectedYear, t.tracker?.months]);

  const tabLabels: Record<BookStatus, { label: string; icon: string }> = {
    reading: { label: t.tabs.reading.label, icon: t.tabs.reading.icon },
    want_to_read: { label: t.tabs.want_to_read.label, icon: t.tabs.want_to_read.icon },
    completed: { label: t.tabs.completed.label, icon: t.tabs.completed.icon },
    tracker: { label: t.tabs.tracker?.label || '📊 Трекер', icon: '📊' },
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
            className={lang === 'ua' ? 'active' : ''}
            onClick={() => changeLanguage('ua')}
          >
            UA
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
                <label>{formData.status === 'reading' ? (t.form.labels.comment || 'Комментарий') : (t.form.labels.genre || 'Жанр')}</label>
                {formData.status === 'reading' ? (
                  <>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Заметки о книге..."
                      rows={2}
                      style={{ minHeight: '60px', resize: 'vertical' }}
                    />
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label>{t.form.labels.genre || 'Жанр'}</label>
                      <input
                        type="text"
                        value={formData.genre}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        placeholder={t.form.placeholders.genre || 'Например: Фантастика'}
                      />
                    </div>
                  </>
                ) : (
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder={t.form.placeholders.genre || 'Например: Фантастика'}
                  />
                )}
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

              {formData.status === 'completed' && (
                <div className="form-group">
                  <label>📅 {t.form.labels.completedDate || 'Дата прочтения'}</label>
                  <input
                    type="date"
                    value={formData.completed_date}
                    onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      background: '#ffffff0d',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      color: '#fff',
                    }}
                  />
                </div>
              )}

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
      ) : activeTab === 'tracker' ? (
        <div className="tracker-container">
          <TrackerView
            trackerData={trackerData}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            t={t}
          />
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
