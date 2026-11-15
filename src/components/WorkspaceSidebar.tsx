'use client';

import { BarChart3, Building2, ChevronDown, CircleHelp, ClipboardList, Contact, Images, LayoutDashboard, Link2, PanelLeftClose, PanelLeftOpen, Plus, QrCode } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useId, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorNavigation } from '@/components/EditorNavigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { readQRListQuery } from '@/lib/qr-list';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';

const qrLinks = [
  { key: 'active', label: 'Active tracked codes', href: '/my-qrcodes?mode=tracked&status=active' },
  { key: 'inactive', label: 'Inactive tracked codes', href: '/my-qrcodes?mode=tracked&status=inactive' },
  { key: 'direct', label: 'Direct QR Codes', href: '/my-qrcodes?mode=direct' },
];

const row = 'flex min-h-11 items-center gap-2 rounded-md px-3 text-start text-sm font-medium outline-none hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

export function WorkspaceNavigation({ id, collapsed = false, onFollow }: {
  id?: string;
  collapsed?: boolean;
  onFollow?: () => void;
}) {
  const { t: copy, i18n } = useTranslation('copy');
  const pathname = usePathname();
  const { mode, status } = readQRListQuery(useSearchParams());
  const { navigate } = useEditorNavigation();
  const [qrOpen, setQROpen] = useState(true);
  const qrMenu = useId();
  const inList = pathname === '/my-qrcodes';
  const currentFilter = mode === 'direct' ? mode : status;
  const iconOnly = collapsed ? ' justify-center px-1' : '';
  const labelClass = collapsed ? 'sr-only' : '';

  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onFollow?.();
    navigate(event.currentTarget.pathname + event.currentTarget.search + event.currentTarget.hash);
  }

  function item(href: string, text: string, Icon: typeof QrCode, current: boolean, className: string) {
    const label = copy(text);
    const link = <a href={href} onClick={follow} aria-current={current ? 'page' : undefined} className={className}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={labelClass}>{label}</span>
    </a>;
    return collapsed ? <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>{label}</TooltipContent>
    </Tooltip> : link;
  }

  return <nav id={id} aria-label={copy('Workspace navigation')} className="grid gap-1">
    {!collapsed && <WorkspaceSwitcher />}
    {item('/app', 'Create New', Plus, pathname === '/app',
      'mb-2 flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white outline-none hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-ring')}
    {item('/overview', 'Overview', LayoutDashboard, pathname === '/overview',
      row + iconOnly + (pathname === '/overview' ? ' bg-background' : ''))}
    {collapsed
      ? item('/my-qrcodes', 'QR Codes', QrCode, inList, row + iconOnly + (inList ? ' bg-background' : ''))
      : <div>
        <div className={`flex items-center rounded-md ${inList ? 'bg-background' : ''}`}>
          {item('/my-qrcodes', 'QR Codes', QrCode, inList && !currentFilter, row + ' min-w-0 flex-1')}
          <button type="button" aria-controls={qrMenu} aria-expanded={qrOpen} onClick={() => setQROpen(open => !open)}
            aria-label={copy(qrOpen ? 'Collapse QR Codes' : 'Expand QR Codes')}
            className="grid size-11 shrink-0 place-items-center rounded-md outline-none hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <ChevronDown className={`size-4 ${qrOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        <ul id={qrMenu} hidden={!qrOpen} className="ps-6">
          {qrLinks.map(({ key, label, href }) => {
            const current = inList && currentFilter === key;
            return <li key={href}><a href={href} onClick={follow}
              aria-current={current ? 'page' : undefined}
              className={row + (current ? ' bg-background' : ' bg-transparent')}>{copy(label)}</a></li>;
          })}
        </ul>
      </div>}
    {item('/analytics', 'Analytics', BarChart3, pathname === '/analytics',
      row + iconOnly + (pathname === '/analytics' ? ' bg-background' : ''))}
    {item('/linkpages', 'Linkpages', Link2, pathname.startsWith('/linkpages'),
      row + iconOnly + (pathname.startsWith('/linkpages') ? ' bg-background' : ''))}
    {item('/cards', 'Cards', Contact, pathname.startsWith('/cards'),
      row + iconOnly + (pathname.startsWith('/cards') ? ' bg-background' : ''))}
    {item('/forms', 'Forms', ClipboardList, pathname.startsWith('/forms'),
      row + iconOnly + (pathname.startsWith('/forms') ? ' bg-background' : ''))}
    {item('/assets', 'Asset library', Images, pathname === '/assets',
      row + iconOnly + (pathname === '/assets' ? ' bg-background' : ''))}
    {item('/settings/organization', 'Organization', Building2, pathname.startsWith('/settings'),
      row + iconOnly + (pathname.startsWith('/settings') ? ' bg-background' : ''))}
    {item('/app#how-to-create', 'QR Code guide', CircleHelp, false, row + iconOnly + ' mt-2')}
  </nav>;
}

export function WorkspaceSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t: copy } = useTranslation('copy');
  const navId = useId();
  return <aside className="hidden border-e bg-zinc-200/80 p-2 dark:bg-muted lg:block">
    <div className="sticky top-2 space-y-2">
      <div className={`flex items-center gap-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <a href="/overview" className="flex min-h-11 items-center gap-2 rounded-md px-2 text-base font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <QrCode size={20} aria-hidden="true" />QRConnect
        </a>}
        <button type="button" onClick={onToggle} aria-controls={navId} aria-expanded={!collapsed}
          aria-label={copy(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          title={copy(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          className="grid size-11 shrink-0 place-items-center rounded-md outline-none hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          {collapsed ? <PanelLeftOpen className="size-4 rtl:-scale-x-100" aria-hidden="true" /> : <PanelLeftClose className="size-4 rtl:-scale-x-100" aria-hidden="true" />}
        </button>
      </div>
      <WorkspaceNavigation id={navId} collapsed={collapsed} />
    </div>
  </aside>;
}
