import { useLanguage } from '../contexts/language-context';
import translations, { TranslationKeys } from '../translations';

export function useTranslation() {
  const { language } = useLanguage();
  
  const t = (key: keyof TranslationKeys, fallback?: string): string => {
    const translation = translations[language]?.[key];
    if (translation) {
      return translation;
    }
    
    // Fallback to English if translation not found
    const englishTranslation = translations.en[key];
    if (englishTranslation) {
      return englishTranslation;
    }
    
    // Final fallback to provided fallback or key
    return fallback || key;
  };
  
  return { t };
}