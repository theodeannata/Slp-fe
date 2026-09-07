"use client";

import { useAppStore } from "@/lib/store";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LanguageToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function LanguageToggle({ showLabel = false, className = "" }: LanguageToggleProps) {
  const { language, toggleLanguage } = useAppStore();

  return (
    <Button
      variant="outline"
      size={showLabel ? "sm" : "icon"}
      onClick={toggleLanguage}
      className={`rounded-xl shadow-xs font-semibold text-xs transition-colors flex items-center gap-1.5 ${className}`}
      aria-label={`Switch language from ${language.toUpperCase()}`}
      title={language === "en" ? "Ganti ke Bahasa Indonesia" : "Switch to English"}
    >
      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="tracking-wide uppercase font-bold text-foreground">
        {language === "en" ? "EN" : "ID"}
      </span>
      {showLabel && (
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          ({language === "en" ? "English" : "Indonesia"})
        </span>
      )}
    </Button>
  );
}

export default LanguageToggle;
