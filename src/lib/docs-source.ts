import 'server-only';
import { loader } from 'fumadocs-core/source';
import { docs, arabicDocs } from '../../.source/server';

export const docsSources = {
  en: loader({ baseUrl: '/docs', source: docs.toFumadocsSource() }),
  ar: loader({ baseUrl: '/docs/ar', source: arabicDocs.toFumadocsSource() }),
};
