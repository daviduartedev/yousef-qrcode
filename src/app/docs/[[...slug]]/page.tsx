import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, BookOpen, QrCode } from 'lucide-react';
import { DocsSearch } from '@/components/docs/DocsSearch';
import { docsSources } from '@/lib/docs-source';
import { docsLabels, docsUrl, type DocsLanguage } from '@/lib/docs-languages';

type Props = { params: Promise<{ slug?: string[] }> };

function getArticle(segments: string[] = []) {
  const language: DocsLanguage = segments[0] === 'ar' ? 'ar' : 'en';
  const slug = language === 'ar' ? segments.slice(1) : segments;
  const page = docsSources[language].getPage(slug);
  if (!page) notFound();
  return { language, slug, page };
}

export function generateStaticParams() {
  return [
    ...docsSources.en.generateParams(),
    ...docsSources.ar.generateParams().map(({ slug }) => ({ slug: ['ar', ...slug] })),
  ];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = getArticle((await params).slug);
  return { title: page.data.title, description: page.data.description };
}

export default async function DocumentationPage({ params }: Props) {
  const { language, page, slug } = getArticle((await params).slug);
  const labels = docsLabels[language];
  const pages = docsSources[language].pageTree.children.filter(item => item.type === 'page');
  const Body = page.data.body;
  return <div className="docs-portal" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
    <header className="docs-header">
      <div className="docs-header-inner">
        <Link href={docsUrl(language)} className="docs-brand"><QrCode size={22} aria-hidden="true" /><span>QRConnect</span></Link>
        <DocsSearch key={language} language={language} />
        <div className="docs-header-actions">
          <div className="docs-languages">
            <Link href={docsUrl('en', slug)} hrefLang="en" lang="en" aria-current={language === 'en' ? 'page' : undefined}>English</Link>
            <Link href={docsUrl('ar', slug)} hrefLang="ar" lang="ar" aria-current={language === 'ar' ? 'page' : undefined}>العربية</Link>
          </div>
          <Link href="/auth" className="docs-open">{labels.open} <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </header>
    <div className="docs-frame">
      <nav className="docs-nav" aria-label={labels.documentation}>
        <p><BookOpen size={16} aria-hidden="true" /> {labels.documentation}</p>
        <ul>{pages.map(item => <li key={item.url}>
          <Link href={item.url} aria-current={item.url === page.url ? 'page' : undefined}>{item.name}</Link>
        </li>)}</ul>
      </nav>
      <main className="docs-content" id="docs-content">
        <div className="docs-main">
          <header className="docs-title">
            <p><Link href={docsUrl(language)}>{labels.documentation}</Link><span aria-hidden="true"> / </span> QRConnect</p>
            <h1>{page.data.title}</h1>
            <p>{page.data.description}</p>
          </header>
          <article className="docs-article"><Body /></article>
        </div>
        {page.data.toc.length > 0 && <aside className="docs-toc" aria-label={labels.toc}>
          <p>{labels.toc}</p>
          <ul>{page.data.toc.map(item => <li key={item.url}><a href={item.url}>{item.title}</a></li>)}</ul>
        </aside>}
      </main>
    </div>
  </div>;
}
