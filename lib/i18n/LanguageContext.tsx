'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { translations, Lang, TranslationKey } from './translations'

interface LanguageContextType {
  lang: Lang
  toggleLang: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'hi',
  toggleLang: () => {},
  t: (key) => translations[key]?.en ?? key,
})

export function LanguageProvider({
  children,
  defaultLang = 'hi',
}: {
  children: ReactNode
  defaultLang?: Lang
}) {
  const [lang, setLang] = useState<Lang>(defaultLang)

  const toggleLang = () => setLang((l) => (l === 'en' ? 'hi' : 'en'))

  const t = (key: TranslationKey): string =>
    translations[key]?.[lang] ?? translations[key]?.en ?? key

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
