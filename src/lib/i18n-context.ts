import { createContext, useContext } from 'react'

import type { Dir } from './locales'

export interface I18n {
  /** Looks up a key and fills {placeholders}. */
  t: (key: string, vars?: Record<string, string | number>) => string
  /** The language on screen: a BCP 47 primary subtag from LOCALES, and the
   *  same value that is on <html lang>. Passed to the Intl formatters in
   *  format.ts, so a date in a Tamil page is written the Tamil way. */
  locale: string
  /** Writing direction for that language. On <html dir> as well; exposed here
   *  for the handful of places that have to compute a position in script
   *  rather than declare one in CSS. */
  dir: Dir
  /** Switches language. Persists the choice, swaps <html lang> and <html dir>,
   *  and fetches the table if this is the first time it has been asked for. */
  setLocale: (code: string) => void
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
