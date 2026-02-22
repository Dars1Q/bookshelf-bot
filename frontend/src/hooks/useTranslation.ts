import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

import ru from '../locales/ru.json';
import en from '../locales/en.json';
import uk from '../locales/uk.json';

const translations: Record<string, typeof ru> = {
  ru,
  en,
  uk,
};

// Определение языка по коду Telegram
function getTelegramLanguage(languageCode?: string): string {
  if (!languageCode) return 'ru';
  
  const lang = languageCode.split('-')[0]; // 'ru' из 'ru-RU'
  if (lang in translations) return lang;
  
  // Поддерживаемые языки
  return 'en'; // fallback на английский
}

export function useTranslation() {
  const [lang, setLang] = useState<string>('ru');
  const [t, setT] = useState(translations.ru);

  useEffect(() => {
    // 1. Проверяем сохраненный язык
    const savedLang = localStorage.getItem('language');
    
    if (savedLang && savedLang in translations) {
      setLang(savedLang);
      setT(translations[savedLang]);
      return;
    }

    // 2. Определяем из Telegram
    const user = WebApp.initDataUnsafe?.user;
    if (user?.language_code) {
      const detectedLang = getTelegramLanguage(user.language_code);
      setLang(detectedLang);
      setT(translations[detectedLang]);
      localStorage.setItem('language', detectedLang);
      return;
    }

    // 3. Определяем из браузера
    const browserLang = navigator.language.split('-')[0];
    if (browserLang in translations) {
      setLang(browserLang);
      setT(translations[browserLang]);
      localStorage.setItem('language', browserLang);
      return;
    }

    // 4. Fallback на русский
    setLang('ru');
    setT(translations.ru);
  }, []);

  const changeLanguage = (newLang: string) => {
    if (newLang in translations) {
      setLang(newLang);
      setT(translations[newLang]);
      localStorage.setItem('language', newLang);
    }
  };

  return { t, lang, changeLanguage };
}
