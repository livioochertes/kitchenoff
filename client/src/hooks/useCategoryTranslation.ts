import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../contexts/language-context";
import { useTranslation } from "./useTranslation";

interface TranslatedCategory {
  name: string;
  description: string | null;
}

export function useCategoryTranslations() {
  const { language } = useLanguage();
  const { t } = useTranslation();

  const { data: dbTranslations = {} } = useQuery<Record<number, TranslatedCategory>>({
    queryKey: ["/api/category-translations", language],
    queryFn: async () => {
      if (language === 'en') return {};
      const response = await fetch(`/api/category-translations/${language}`);
      if (!response.ok) return {};
      return response.json();
    },
    enabled: language !== 'en',
    staleTime: 300000,
  });

  const getCategoryName = (category: { id: number; name: string; slug: string }) => {
    if (language === 'en') return category.name;

    if (dbTranslations[category.id]?.name) {
      return dbTranslations[category.id].name;
    }

    const translationKey = `categories.${category.slug}` as any;
    const translated = t(translationKey);
    if (translated !== translationKey) {
      return translated;
    }

    return category.name;
  };

  const getCategoryDescription = (category: { id: number; description: string | null; slug: string }) => {
    if (language === 'en') return category.description;

    if (dbTranslations[category.id]?.description) {
      return dbTranslations[category.id].description;
    }

    const translationKey = `categories.${category.slug}.description` as any;
    const translated = t(translationKey);
    if (translated !== translationKey) {
      return translated;
    }

    return category.description;
  };

  return { getCategoryName, getCategoryDescription };
}
