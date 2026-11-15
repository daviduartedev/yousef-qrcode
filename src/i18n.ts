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
import enForms from './locales/forms.en.json';
import arForms from './locales/forms.ar.json';
import enOrganizations from './locales/organizations.en.json';
import arOrganizations from './locales/organizations.ar.json';
import enAdvanced from './locales/advanced.en.json';
import arAdvanced from './locales/advanced.ar.json';
import enDevelopers from './locales/developers.en.json';
import arDevelopers from './locales/developers.ar.json';
import enIntegrations from './locales/integrations.en.json';
import arIntegrations from './locales/integrations.ar.json';

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
        forms: enForms,
        organizations: enOrganizations,
        advanced: enAdvanced,
        developers: enDevelopers,
        integrations: enIntegrations,
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
        forms: arForms,
        organizations: arOrganizations,
        advanced: arAdvanced,
        developers: arDevelopers,
        integrations: arIntegrations,
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
