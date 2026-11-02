import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import enCopy from './locales/copy.en.json';
import arCopy from './locales/copy.ar.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
        copy: enCopy,
      },
      ar: {
        translation: arTranslations,
        copy: arCopy,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    initImmediate: false,
    defaultNS: 'translation',
    nsSeparator: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
