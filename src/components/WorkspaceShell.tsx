'use client';

import { LogOut, QrCode, Search } from 'lucide-react';
import { useSyncExternalStore, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorNavigation } from '@/components/EditorNavigation';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { qrListHref, readQRListQuery } from '@/lib/qr-list';

const sidebarPreference = 'qrconnect-sidebar-collapsed';
const sidebarCollapsed = () => sessionStorage.getItem(sidebarPreference) === 'true';

function subscribeToSidebar(listener: () => void) {
  window.addEventListener(sidebarPreference, listener);
  return () => window.removeEventListener(sidebarPreference, listener);
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { t: copy } = useTranslation('copy');
  const collapsed = useSyncExternalStore(subscribeToSidebar, sidebarCollapsed, () => false);
  const { navigate, confirmLeave } = useEditorNavigation();
  const { signOut } = useAuth();
  const { toast } = useToast();

  async function logout() {
    if (!confirmLeave()) return;
    try {
      await signOut();
      navigate('/');
    } catch {
      toast({ title: copy('Could not sign out. Try again.'), variant: 'destructive' });
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('q') ?? '');
    navigate(qrListHref(readQRListQuery(new URLSearchParams({ q: value }))));
  }

  const columns = collapsed ? 'lg:grid-cols-[4.25rem_minmax(0,1fr)]'
    : 'lg:grid-cols-[14.75rem_minmax(0,1fr)] 2xl:grid-cols-[16.5rem_minmax(0,1fr)]';
  return <div className={`grid min-h-screen min-w-0 grid-rows-[auto_1fr] bg-muted/40 text-foreground lg:grid-rows-[1fr] ${columns}`}>
      <WorkspaceSidebar collapsed={collapsed} onToggle={() => {
        sessionStorage.setItem(sidebarPreference, String(!collapsed));
        window.dispatchEvent(new Event(sidebarPreference));
      }} />
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-background px-4 py-2 sm:px-6">
          <a href="/my-qrcodes" onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigate('/my-qrcodes');
          }} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-muted px-3 text-sm font-medium">
            <QrCode size={17} aria-hidden="true" />{copy('QR Codes')}
          </a>
          <form role="search" onSubmit={search} className="order-last w-full sm:order-none sm:ms-auto sm:w-56 lg:w-72">
            <div className="flex min-h-11 items-center gap-2 rounded-md bg-muted px-3 focus-within:ring-2 focus-within:ring-ring">
              <button type="submit" aria-label={copy('Search QR Codes')} className="grid size-8 shrink-0 place-items-center rounded-sm text-muted-foreground hover:text-foreground">
                <Search size={17} aria-hidden="true" />
              </button>
              <input type="search" name="q" maxLength={2048} aria-label={copy('Search QR Codes')} placeholder={copy('Search QR Codes')}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
          </form>
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" className="min-h-11 gap-2" onClick={logout}><LogOut size={16} aria-hidden="true" />{copy('Sair')}</Button>
          </div>
        </header>
        {children}
      </div>
  </div>;
}
