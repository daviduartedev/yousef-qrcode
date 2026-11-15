'use client';

import { LogOut, QrCode } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorNavigation } from '@/components/EditorNavigation';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WorkspaceDrawer } from '@/components/WorkspaceDrawer';
import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

  const columns = collapsed ? 'lg:grid-cols-[4.25rem_minmax(0,1fr)]'
    : 'lg:grid-cols-[14.75rem_minmax(0,1fr)] 2xl:grid-cols-[16.5rem_minmax(0,1fr)]';
  return <div className={`grid min-h-screen min-w-0 bg-muted/40 text-foreground ${columns}`}>
    <WorkspaceSidebar collapsed={collapsed} onToggle={() => {
      sessionStorage.setItem(sidebarPreference, String(!collapsed));
      window.dispatchEvent(new Event(sidebarPreference));
    }} />
    <div className="min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b bg-background px-3 py-2 sm:gap-x-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-1">
          <WorkspaceDrawer />
          <a href="/my-qrcodes" onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigate('/my-qrcodes');
          }} className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-muted px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2 sm:px-3">
            <QrCode className="size-4 shrink-0" aria-hidden="true" />{copy('QR Codes')}
          </a>
        </div>
        <WorkspaceSearch />
        <div className="ms-auto flex shrink-0 items-center gap-1 sm:ms-0">
          <LanguageToggle />
          <ThemeToggle />
          <Button type="button" variant="ghost" className="size-11 px-0 sm:w-auto sm:px-3" onClick={logout} aria-label={copy('Sair')}>
            <LogOut size={16} aria-hidden="true" className="rtl:-scale-x-100" /><span className="hidden sm:inline">{copy('Sair')}</span>
          </Button>
        </div>
      </header>
      {children}
    </div>
  </div>;
}
