'use client';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Menu, Moon, QrCode, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from './LanguageToggle';
import { useAuth } from '@/hooks/useAuth';

/** Public destinations shared by the desktop and mobile navigation. */
export const publicSections = [
  { href: '/#features', label: 'Features' },
  { href: '/#analytics', label: 'Analytics' },
  { href: '/#industries', label: 'Solutions' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/docs', label: 'Documentation' },
] as const;

const LandingHeader = () => {
  const { t: copy } = useTranslation('copy');
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const signedIn = mounted && isAuthenticated;
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold text-foreground">QRConnect</span>
        </Link>

        <nav aria-label={copy('Main')} className="hidden lg:flex items-center gap-6">
          {publicSections.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {copy(item.label)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageToggle />
          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 text-foreground" aria-label={copy('Toggle theme')}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
          {signedIn ? (
            <Button asChild className="rounded-lg font-medium"><Link href="/overview">{copy('Open dashboard')}</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex font-medium"><Link href="/auth">{copy('Login')}</Link></Button>
              <Button asChild className="hidden sm:inline-flex rounded-lg px-5 font-medium"><Link href="/auth?mode=signup">{copy('Start Free Trial')}</Link></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-expanded={open} aria-controls={menuId}
            aria-label={copy(open ? 'Close menu' : 'Open menu')} onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <nav id={menuId} aria-label={copy('Main')} className="lg:hidden max-w-7xl mx-auto pt-3 pb-2 flex flex-col gap-1">
          {publicSections.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-muted">{copy(item.label)}</a>
          ))}
          {!signedIn && (
            <div className="grid grid-cols-2 gap-2 pt-2 sm:hidden">
              <Button asChild variant="outline"><Link href="/auth">{copy('Login')}</Link></Button>
              <Button asChild><Link href="/auth?mode=signup">{copy('Start Free Trial')}</Link></Button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
};

export default LandingHeader;
