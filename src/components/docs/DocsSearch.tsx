'use client';

import { useId } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useFetchSearch } from 'fumadocs-core/search/client';
import { docsLabels, type DocsLanguage } from '@/lib/docs-languages';

export function DocsSearch({ language }: { language: DocsLanguage }) {
  const id = useId();
  const labels = docsLabels[language];
  const { search, onSearchChange, data, isLoading, error } = useFetchSearch({ api: '/api/docs/search?language=' + language });
  const active = search.trim().length >= 2;
  const results = data?.query === search ? data.items.flatMap(item => item.type === 'table' ? item.rows : [item]).slice(0, 8) : [];

  return <div className="docs-search">
    <label htmlFor={id}><Search size={16} aria-hidden="true" /><span className="sr-only">{labels.search}</span></label>
    <input id={id} type="search" placeholder={labels.search} value={search} maxLength={120}
      onKeyDown={event => { if (event.key === 'Escape') onSearchChange(''); }}
      onChange={event => onSearchChange(event.target.value)} />
    {active && <div className="docs-search-results">
      <p role="status">{isLoading ? labels.searching : error ? labels.unavailable : results.length ? labels.results : labels.empty}</p>
      <ul>{results.map(item => <li key={item.id}><Link href={item.url} onClick={() => onSearchChange('')}>{item.content}</Link></li>)}</ul>
    </div>}
  </div>;
}
