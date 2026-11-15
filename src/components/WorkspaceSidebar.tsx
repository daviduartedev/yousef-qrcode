'use client';

import { ChevronDown, CircleHelp, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus, QrCode } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useId, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorNavigation } from '@/components/EditorNavigation';
import { readQRListQuery } from '@/lib/qr-list';

const qrLinks = [
  { key: 'active', label: 'Active tracked codes', href: '/my-qrcodes?mode=tracked&status=active' },
  { key: 'inactive', label: 'Inactive tracked codes', href: '/my-qrcodes?mode=tracked&status=inactive' },
  { key: 'direct', label: 'Direct QR Codes', href: '/my-qrcodes?mode=direct' },
];

const row = 'flex min-h-11 items-center gap-2 rounded-md px-3 text-start text-sm font-medium hover:bg-background/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring';

export function WorkspaceSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t: copy } = useTranslation('copy');
  const pathname = usePathname();
  const { mode, status } = readQRListQuery(useSearchParams());
  const { navigate } = useEditorNavigation();
  const [qrOpen, setQROpen] = useState(true);
  const qrMenu = useId();
  const inList = pathname === '/my-qrcodes';
  const currentFilter = mode === 'direct' ? mode : status;
  const iconOnly = collapsed ? ' lg:justify-center lg:px-1' : '';
  const labelClass = collapsed ? 'lg:sr-only' : '';

  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(event.currentTarget.pathname + event.currentTarget.search + event.currentTarget.hash);
  }

  return <aside className="border-b bg-zinc-200/80 p-2 dark:bg-muted lg:border-b-0 lg:border-e">
    <div className="space-y-2 lg:sticky lg:top-2">
      <div className={`flex items-center gap-1 ${collapsed ? 'lg:flex-col lg:justify-center' : 'justify-between'}`}>
        <a href="/overview" onClick={follow} className={`flex min-h-11 items-center gap-2 rounded-md px-2 text-base font-semibold tracking-tight ${collapsed ? 'lg:hidden' : ''}`}>
          <QrCode size={20} aria-hidden="true" />
          <span className={labelClass}>QRConnect</span>
        </a>
        <button type="button" onClick={onToggle} aria-expanded={!collapsed}
          aria-label={copy(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          title={copy(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          className="hidden size-11 shrink-0 place-items-center rounded-md hover:bg-background/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring lg:grid">
          {collapsed ? <PanelLeftOpen className="size-4 rtl:-scale-x-100" aria-hidden="true" /> : <PanelLeftClose className="size-4 rtl:-scale-x-100" aria-hidden="true" />}
        </button>
      </div>
      <nav aria-label={copy('Workspace navigation')} className="flex flex-wrap gap-1 lg:grid">
        <a href="/app" onClick={follow} aria-current={pathname === '/app' ? 'page' : undefined}
          title={collapsed ? copy('Create New') : undefined}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring lg:mb-2">
          <Plus className="size-4 shrink-0" aria-hidden="true" /><span className={labelClass}>{copy('Create New')}</span>
        </a>
        <a href="/overview" onClick={follow} aria-current={pathname === '/overview' ? 'page' : undefined}
          title={collapsed ? copy('Overview') : undefined}
          className={row + iconOnly + (pathname === '/overview' ? ' bg-background' : '')}>
          <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" /><span className={labelClass}>{copy('Overview')}</span>
        </a>
        <a href="/my-qrcodes" onClick={follow} aria-current={inList ? 'page' : undefined}
          title={collapsed ? copy('QR Codes') : undefined}
          className={row + iconOnly + (collapsed ? '' : ' lg:hidden') + (inList ? ' bg-background' : '')}>
          <QrCode className="size-4 shrink-0" aria-hidden="true" /><span className={labelClass}>{copy('QR Codes')}</span>
        </a>
        {!collapsed && <div className="hidden lg:block">
          <div className={`flex items-center rounded-md ${inList ? 'bg-background' : ''}`}>
            <a href="/my-qrcodes" onClick={follow} aria-current={inList && !currentFilter ? 'page' : undefined}
              className={row + ' min-w-0 flex-1'}>
              <QrCode className="size-4 shrink-0" aria-hidden="true" />{copy('QR Codes')}
            </a>
            <button type="button" aria-controls={qrMenu} aria-expanded={qrOpen} onClick={() => setQROpen(open => !open)}
              aria-label={copy(qrOpen ? 'Collapse QR Codes' : 'Expand QR Codes')}
              className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-background/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              <ChevronDown className={`size-4 ${qrOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>
          <ul id={qrMenu} hidden={!qrOpen} className="ps-6">
            {qrLinks.map(({ key, label, href }) => {
              const current = inList && currentFilter === key;
              return <li key={href}><a href={href} onClick={follow}
                aria-current={current ? 'page' : undefined} className={row + (current ? ' bg-background' : '')}>{copy(label)}</a></li>;
            })}
          </ul>
        </div>}
        <a href="/app#how-to-create" onClick={follow} title={collapsed ? copy('QR Code guide') : undefined}
          className={row + iconOnly + ' lg:mt-3'}>
          <CircleHelp className="size-4 shrink-0" aria-hidden="true" /><span className={labelClass}>{copy('QR Code guide')}</span>
        </a>
      </nav>
    </div>
  </aside>;
}
