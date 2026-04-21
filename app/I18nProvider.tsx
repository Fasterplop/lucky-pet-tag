"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";


export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Esto asegura que la hidratación ocurra correctamente y evita
    // errores de "Text content did not match" en Next.js
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // O un spinner minimalista si prefieres
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}