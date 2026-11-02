import { useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const { t: copy } = useTranslation('copy');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Atualizar direção do documento imediatamente
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    // Salvar preferência
    localStorage.setItem('i18nextLng', lng);
  };

  // Atualizar direção ao montar
  useEffect(() => {
    const currentLang = i18n.language || 'en';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  const currentLanguage = i18n.language || 'en';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={copy('Change language')}>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={currentLanguage === 'en' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇺🇸</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('ar')}
          className={currentLanguage === 'ar' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇸🇦</span>
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
