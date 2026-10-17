import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, format, type DictKey } from "@/lib/i18n";
import { KEYS, load, save } from "@/lib/storage";
import type { Lang, LText } from "@/lib/types";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  tx: (text: LText | undefined, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (load<Lang>("local", KEYS.lang, "zh") === "en" ? "en" : "zh"));

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant-TW" : "en";
    save("local", KEYS.lang, lang);
  }, [lang]);

  const tx = useCallback((text: LText | undefined, vars?: Record<string, string | number>) => (text ? format(text[lang], vars) : ""), [lang]);
  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => tx(dict[key], vars), [tx]);
  const value = useMemo(() => ({ lang, setLang, t, tx }), [lang, t, tx]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside LanguageProvider");
  return c;
}
