"use client";

import { useAppStore } from "@/lib/store";
import { en } from "./translations/en";
import { id } from "./translations/id";
import { Language, TranslationSchema } from "./types";

const dictionaries: Record<Language, TranslationSchema> = {
  en,
  id,
};

export function useTranslation() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const toggleLanguage = useAppStore((state) => state.toggleLanguage);

  const t: TranslationSchema = dictionaries[language] || dictionaries.en;

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
    if (language === "id") {
      return `Rp ${new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0,
      }).format(amount)}`;
    }
    return `Rp ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US").format(num);
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return {
    language,
    setLanguage,
    toggleLanguage,
    t,
    formatCurrency,
    formatNumber,
    formatDate,
  };
}
