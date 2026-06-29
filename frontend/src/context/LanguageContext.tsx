import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { rtlLanguages, supportedLanguages, type SupportedLanguage } from "@/i18n";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem("language");
  if (supportedLanguages.includes(stored as SupportedLanguage)) return stored as SupportedLanguage;
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  useEffect(() => {
    const isRtl = rtlLanguages.includes(language);
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    localStorage.setItem("language", language);
  }, [language, i18n]);

  function setLanguage(next: SupportedLanguage) {
    setLanguageState(next);
  }

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, isRtl: rtlLanguages.includes(language) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
