import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import enCopy from './locales/copy.en.json';
import arCopy from './locales/copy.ar.json';
import enWorkspace from './locales/workspace.en.json';
import arWorkspace from './locales/workspace.ar.json';
import enCreation from './locales/creation.en.json';
import arCreation from './locales/creation.ar.json';
import enAnalytics from './locales/analytics.en.json';
import arAnalytics from './locales/analytics.ar.json';
import enEntry from './locales/entry.en.json';
import arEntry from './locales/entry.ar.json';
import enAssets from './locales/assets.en.json';
import arAssets from './locales/assets.ar.json';
import enLinkpages from './locales/linkpages.en.json';
import arLinkpages from './locales/linkpages.ar.json';
import enCards from './locales/cards.en.json';
import arCards from './locales/cards.ar.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
        copy: enCopy,
        workspace: enWorkspace,
        creation: enCreation,
        analytics: enAnalytics,
        entry: enEntry,
        assets: enAssets,
        linkpages: enLinkpages,
        cards: enCards,
      },
      ar: {
        translation: arTranslations,
        copy: arCopy,
        workspace: arWorkspace,
        creation: arCreation,
        analytics: arAnalytics,
        entry: arEntry,
        assets: arAssets,
        linkpages: arLinkpages,
        cards: arCards,
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
