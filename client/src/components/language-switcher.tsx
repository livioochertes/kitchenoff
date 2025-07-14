import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/language-context';
import { useTranslation } from '@/hooks/useTranslation';

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost';
  size?: 'sm' | 'default';
  showText?: boolean;
  className?: string;
}

export default function LanguageSwitcher({ 
  variant = 'ghost', 
  size = 'sm', 
  showText = true,
  className = ''
}: LanguageSwitcherProps) {
  const { language, setLanguage, getLanguageInfo } = useLanguage();
  const { t } = useTranslation();
  
  const currentLanguage = getLanguageInfo(language);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Globe className="h-4 w-4" />
          {showText && currentLanguage && (
            <>
              <span className="ml-2 hidden sm:inline">{currentLanguage.flag}</span>
              <span className="ml-1 hidden md:inline">{currentLanguage.nativeName}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
          {t('language.select')}
        </div>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center space-x-3 ${
              language === lang.code ? 'bg-accent' : ''
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <div className="flex-1">
              <div className="font-medium">{lang.nativeName}</div>
              <div className="text-sm text-muted-foreground">{lang.name}</div>
            </div>
            {language === lang.code && (
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}