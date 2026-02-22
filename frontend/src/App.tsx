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
import './App.css';

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  rating: number | null;
}

interface BookFormData {
  title: string;
  author: string;
  description: string;
  cover_url: string;
  rating: number | null;
}

const initialFormData: BookFormData = {
  title: '',
  author: '',
  description: '',
  cover_url: '',
  rating: null,
};

const BOOKS_PER_SHELF = 4;

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<BookFormData>(initialFormData);
  const [telegramId, setTelegramId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Инициализация Telegram Web App
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();

    const user = WebApp.initDataUnsafe?.user;
    if (user?.id) {
      const tgId = `tg_${user.id}`;
      setTelegramId(tgId);
      
      const username = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
      if (username) {
        localStorage.setItem('telegram_username', username);
      }
    } else {
      const storedId = localStorage.getItem('telegram_id');
      const id = storedId || 'user_' + Math.random().toString(36).substr(2, 9);
      setTelegramId(id);
      localStorage.setItem('telegram_id', id);
    }
  }, []);

  // Загрузка книг
  useEffect(() => {
    if (telegramId) {
      fetchBooks();
    }
  }, [telegramId]);

  // Настройка MainButton
  useEffect(() => {
    if (!telegramId) return;

    WebApp.MainButton.setText(books.length === 0 ? '➕ ДОБАВИТЬ ПЕРВУЮ КНИГУ' : '➕ ДОБАВИТЬ КНИГУ');
    WebApp.MainButton.show();
    WebApp.MainButton.onClick(() => {
      setShowForm(true);
    });

    return () => {
      WebApp.MainButton.offClick(() => {
        setShowForm(true);
      });
    };
  }, [books.length, telegramId]);

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

      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];

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
        });
      } else {
        await addDoc(booksRef, {
          title: formData.title,
          author: formData.author || null,
          description: formData.description || null,
          cover_url: formData.cover_url || null,
          rating: formData.rating || null,
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
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту книгу?')) return;

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
        ★
      </span>
    ));
  };

  // Разбиваем книги на полки
  const shelves: Book[][] = [];
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) {
    shelves.push(books.slice(i, i + BOOKS_PER_SHELF));
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner">📚</div>
          <p>Загружаем полку...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>📚 Книжная полка</h1>
        <p>Ваша персональная коллекция книг</p>
      </header>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBook ? '✏️ Редактировать книгу' : '➕ Новая книга'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Название *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Введите название"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Автор</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Имя автора"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Обложка (URL)</label>
                <input
                  type="url"
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание книги"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Оценка</label>
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
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  {editingBook ? 'Сохранить' : 'Добавить на полку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <h3>Полка пуста</h3>
          <p>Добавьте свою первую книгу!</p>
          <button 
            className="btn-primary" 
            onClick={() => setShowForm(true)}
            style={{
              marginTop: '20px',
              padding: '16px 32px',
              fontSize: '1.1rem'
            }}
          >
            ➕ Добавить первую книгу
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
                        <div className="book-info-title">{book.title}</div>
                        {book.author && <div className="book-info-author">{book.author}</div>}
                        {book.rating && (
                          <div className="book-info-rating">
                            {renderStars(book.rating)}
                          </div>
                        )}
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
                        ></div>
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
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '0 auto'
              }}
            >
              <span>➕</span>
              <span>Добавить книгу</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
