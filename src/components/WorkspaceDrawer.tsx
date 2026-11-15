'use client';

import { Menu, QrCode, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkspaceNavigation } from '@/components/WorkspaceSidebar';
import { Button } from '@/components/ui/button';

export function WorkspaceDrawer() {
  const { t } = useTranslation('workspace');
  const { t: copy } = useTranslation('copy');
  const trigger = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeAtDesktop = () => {
      if (desktop.matches && drawer.current?.open) drawer.current.close();
    };
    desktop.addEventListener('change', closeAtDesktop);
    return () => desktop.removeEventListener('change', closeAtDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;
    const page = document.documentElement;
    const previousOverflow = page.style.overflow;
    page.style.overflow = 'hidden';
    return () => { page.style.overflow = previousOverflow; };
  }, [open]);

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'))
      .filter(element => element.getClientRects().length > 0);
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first && last) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last && first) {
      event.preventDefault();
      first.focus();
    }
  }

  return <>
    <Button type="button" ref={trigger} size="icon" variant="ghost" className="size-11 lg:hidden"
      aria-label={t('openNavigation')} aria-haspopup="dialog" aria-controls={id} aria-expanded={open}
      onClick={() => {
        if (!drawer.current?.open) {
          drawer.current?.showModal();
          setOpen(true);
        }
      }}>
      <Menu className="size-5" aria-hidden="true" />
    </Button>
    <dialog id={id} ref={drawer} aria-label={copy('Workspace navigation')}
      className="fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-none w-80 max-w-[calc(100vw_-_3rem)] overflow-y-auto overscroll-contain border-e bg-zinc-200 text-foreground backdrop:bg-black/50 dark:bg-muted lg:hidden"
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      onClose={() => {
        setOpen(false);
        if (trigger.current?.getClientRects().length) trigger.current.focus({ preventScroll: true });
      }}
      onKeyDown={keepFocusInside}>
      <div className="min-h-full space-y-3 p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex items-center gap-2 px-1 text-base font-semibold tracking-tight">
            <QrCode className="size-5 shrink-0" aria-hidden="true" />QRConnect
          </span>
          <Button type="button" size="icon" variant="ghost" className="size-11 shrink-0"
            aria-label={t('closeNavigation')} onClick={() => drawer.current?.close()}>
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <WorkspaceNavigation onFollow={() => drawer.current?.close()} />
      </div>
    </dialog>
  </>;
}
