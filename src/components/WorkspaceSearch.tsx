'use client';

import { ArrowUpRight, CornerDownLeft, LoaderCircle, QrCode, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorNavigation } from '@/components/EditorNavigation';
import { qrListHref, readQRListQuery } from '@/lib/qr-list';
import { normalizeQRSearch, type QRSearchResult } from '@/lib/qr-search';

type SearchResponse = { query: string; results: QRSearchResult[] | null };

export function WorkspaceSearch() {
  const { t } = useTranslation('workspace');
  const { t: copy } = useTranslation('copy');
  const { navigate } = useEditorNavigation();
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [active, setActive] = useState(-1);
  const [response, setResponse] = useState<SearchResponse>();
  const query = normalizeQRSearch(value);
  const expanded = open && query !== '';
  const current = response?.query === query ? response : undefined;
  const results = current?.results ?? [];
  const selected = results[active];
  const optionId = selected ? listId + '-' + selected.id : undefined;

  function dismiss() {
    setOpen(false);
    setActive(-1);
  }

  function choose(result?: QRSearchResult) {
    if (!query) return;
    dismiss();
    const href = result
      ? '/my-qrcodes?focus=' + encodeURIComponent(result.id)
      : qrListHref(readQRListQuery(new URLSearchParams({ q: query })));
    navigate(href);
  }

  function handleInputKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!query) break;
        event.preventDefault();
        setOpen(true);
        if (!results.length) break;
        setActive(index => {
          if (event.key === 'ArrowDown') return (index + 1) % results.length;
          return index < 1 ? results.length - 1 : index - 1;
        });
        break;
      }
      case 'Escape':
        if (!expanded) break;
        event.preventDefault();
        dismiss();
        break;
      case 'Enter':
        if (!expanded || !selected) break;
        event.preventDefault();
        choose(selected);
        break;
    }
  }

  useEffect(() => {
    function shortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey ||
        (!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'k' ||
        document.querySelector('dialog[open]')) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
      setOpen(true);
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !form.current?.contains(event.target)) dismiss();
    }
    window.addEventListener('keydown', shortcut);
    window.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('keydown', shortcut);
      window.removeEventListener('pointerdown', outside);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const request = new AbortController();
    const timer = window.setTimeout(() => {
      fetch('/api/qr-codes/search?' + new URLSearchParams({ q: query }), {
        cache: 'no-store',
        signal: request.signal,
      })
        .then(async result => {
          if (!result.ok) throw new Error();
          const { results }: { results: QRSearchResult[] } = await result.json();
          if (!request.signal.aborted) setResponse({ query, results });
        })
        .catch(() => {
          if (!request.signal.aborted) setResponse({ query, results: null });
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [expanded, query]);

  useEffect(() => {
    if (expanded && optionId) document.getElementById(optionId)?.scrollIntoView({ block: 'nearest' });
  }, [expanded, optionId]);

  return <form
    ref={form}
    role="search"
    className="relative order-last w-full sm:order-none sm:ms-auto sm:min-w-44 sm:max-w-[27rem] sm:flex-1"
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
    }}
    onSubmit={event => { event.preventDefault(); choose(); }}
  >
    <div className="flex min-h-11 items-center gap-2 rounded-md bg-muted px-3 focus-within:ring-2 focus-within:ring-ring">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        ref={input}
        role="combobox"
        type="text"
        name="q"
        dir="auto"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={2048}
        aria-label={copy('Search QR Codes')}
        aria-keyshortcuts="Control+K Meta+K"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded ? optionId : undefined}
        placeholder={copy('Search by name or destination')}
        value={value}
        onChange={event => {
          if (normalizeQRSearch(event.target.value) !== query) setResponse(undefined);
          setValue(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleInputKeys}
        className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
      />
      <kbd aria-hidden="true" dir="ltr" className="hidden shrink-0 rounded border bg-background px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground md:inline">
        Ctrl / ⌘ K
      </kbd>
    </div>
    {expanded && <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
      <div role="status" className={!current || results.length === 0 ? 'flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground' : 'sr-only'}>
        {!current ? <><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />{t('searching')}</> :
          current.results === null ? t('searchError') : results.length === 0 ? copy('No matching QR Codes') : t('matchCount', { count: results.length })}
      </div>
      <ul id={listId} role="listbox" aria-label={t('searchResults')} aria-busy={!current}
        className="max-h-[min(50dvh,24rem)] overflow-y-auto overscroll-contain">
        {results.map((result, index) => <li
          id={listId + '-' + result.id}
          key={result.id}
          role="option"
          aria-selected={index === active}
          onMouseDown={event => event.preventDefault()}
          onClick={() => choose(result)}
          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-start hover:bg-accent aria-selected:bg-accent"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded border text-muted-foreground">
            <QrCode className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <bdi className="block truncate text-sm font-medium">{result.title || t('untitled')}</bdi>
            <bdi dir="ltr" className="block truncate text-xs text-muted-foreground">{result.destination_url}</bdi>
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
        </li>)}
      </ul>
      <button type="submit" className="flex min-h-11 w-full items-center justify-between gap-3 border-t px-3 text-start text-sm font-medium hover:bg-accent focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-ring">
        {t('viewAll')}
        <CornerDownLeft className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
      </button>
    </div>}
  </form>;
}
