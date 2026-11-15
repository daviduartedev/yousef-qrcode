export type DocsLanguage = 'en' | 'ar';

export const docsLabels = {
  en: {
    documentation: 'Documentation', open: 'Open QRConnect', toc: 'On this page',
    search: 'Search documentation', searching: 'Searching…', results: 'Search results',
    empty: 'No matches', unavailable: 'Search is unavailable. Use the navigation menu.',
  },
  ar: {
    documentation: 'التوثيق', open: 'افتح QRConnect', toc: 'في هذه الصفحة',
    search: 'ابحث في التوثيق', searching: 'جارٍ البحث…', results: 'نتائج البحث',
    empty: 'لا توجد نتائج', unavailable: 'البحث غير متاح. استخدم قائمة التنقل.',
  },
} as const;

export function docsUrl(language: DocsLanguage, slug: string[] = []) {
  return ['/docs', ...(language === 'ar' ? ['ar'] : []), ...slug].join('/');
}
