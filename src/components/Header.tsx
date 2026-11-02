'use client';

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from 'next/navigation';
import { LogOut, User, QrCode } from "lucide-react";
import Link from 'next/link';
import { useEditorNavigation } from './EditorNavigation';

const Header = () => {
  const { t: copy } = useTranslation('copy');
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const {navigate,confirmLeave}=useEditorNavigation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    if (!confirmLeave()) return;
    await signOut();
    navigate("/");
  };

  return (
    <header className="bg-background border-b border-border py-4 px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-6 h-6 bg-foreground rounded-sm flex items-center justify-center">
              <div className="w-4 h-4 bg-background rounded-full" />
            </div>
            <span className="text-xl font-bold">{t('header.logo')}</span>
          </div>

          <nav className="hidden xl:flex items-center gap-6">
            <button
              onClick={() => scrollToSection('qr-generator')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t('header.qrCodes')}
            </button>
            <button
              onClick={() => scrollToSection('tracking-info')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t('header.digitalBusinessCards')}
            </button>
            <button
              onClick={() => scrollToSection('benefits')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t('header.solution')}
            </button>
            <button
              onClick={() => scrollToSection('how-to-create')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t('header.learn')}
            </button>
            <button
              onClick={() => scrollToSection('roi')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t('header.pricing')}
            </button>
            <button
              onClick={() => scrollToSection('ga4')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {t('header.demo')}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />

          {user ? (
            <>
              <Button
                variant={pathname === "/my-qrcodes" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate("/my-qrcodes")}
                className="hidden md:flex"
              >
                <QrCode className="w-4 h-4 mr-2" />
                {copy("Meus QR Codes")}</Button>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-1" />
                {copy("Sair")}</Button>
            </>
          ) : (
            <>
              <Button
                size="default"
                className="font-medium"
                onClick={() => navigate("/auth")}
              >
                {t('header.startFreeTrial')}
              </Button>
              <Button
                variant="ghost"
                size="default"
                className="font-medium"
                onClick={() => navigate("/auth")}
              >
                {t('header.login')}
              </Button>
            </>
          )}
        </div>
      </div>
      <nav aria-label={copy('Workspace navigation')} className="max-w-7xl mx-auto flex flex-wrap gap-5 pt-3 text-sm">
        <Link href="/" className="hover:text-primary">{copy('Home')}</Link>
        <Link href="/app" className="hover:text-primary">{copy('Create QR Code')}</Link>
        <Link href="/my-qrcodes" className="hover:text-primary">{copy('My QR Codes')}</Link>
      </nav>
    </header>
  );
};

export default Header;
