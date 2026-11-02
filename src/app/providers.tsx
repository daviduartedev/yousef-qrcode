'use client';

import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import { useEffect } from 'react';
import i18n from '@/i18n';
import { useLanguageDirection } from '@/hooks/useLanguageDirection';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

function LanguagePreference() {
  useLanguageDirection();
  useEffect(() => {
    const language = localStorage.getItem('i18nextLng') || navigator.language;
    void i18n.changeLanguage(language.startsWith('ar') ? 'ar' : 'en');
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}><ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <TooltipProvider><LanguagePreference />{children}<Toaster /><Sonner /></TooltipProvider>
  </ThemeProvider></I18nextProvider>;
}
