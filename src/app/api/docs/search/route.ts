import { createFromSource } from 'fumadocs-core/search/server';
import { docsSources } from '@/lib/docs-source';

const search = { en: createFromSource(docsSources.en), ar: createFromSource(docsSources.ar) };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('query')?.trim() ?? '';
  if (q.length < 2 || q.length > 120) return Response.json([]);
  const language = url.searchParams.get('language') === 'ar' ? 'ar' : 'en';
  return search[language].GET(request);
}
