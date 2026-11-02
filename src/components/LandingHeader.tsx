'use client';
import { useTranslation } from 'react-i18next';

import { Button } from "@/components/ui/button";
import { QrCode, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { LanguageToggle } from './LanguageToggle';

const LandingHeader = () => {
  const { t: copy } = useTranslation('copy');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const navigate = useRouter().push;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-background border-b border-border py-4 px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">QRConnect</span>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copy("Product")}</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copy("Features")}</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copy("Solutions")}</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copy("Pricing")}</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copy("About")}</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copy("Contact")}</a>
          <button onClick={()=>navigate('/auth')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copy("Login")}</button>
        </nav>

        {/* CTA and Theme Toggle */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 font-medium"
            onClick={() => navigate('/app')}
          >
            {copy("Start Free Trial")}</Button>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 text-foreground"
              aria-label={copy("Toggle theme")}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
