import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useLanguageDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const direction = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
}
