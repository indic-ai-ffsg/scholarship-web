import { createContext, useContext } from 'react'

export interface I18n {
  /** Looks up a key and fills {placeholders}. */
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
