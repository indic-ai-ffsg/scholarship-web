/* The copy provider.
 *
 * Component only; the hook lives alongside in i18n-context.ts and the table in
 * i18n-strings.ts, because a module exporting both a component and a plain
 * function breaks Fast Refresh.
 *
 * There is one language now, so there is no state here, nothing stored on the
 * device and nothing read from navigator.language. What remains is the lookup:
 * every string in the product is fetched by key, which keeps the copy in one
 * file where it can be read and reviewed as a whole — and keeps a second
 * language a table away rather than a rewrite of every screen.
 */

import { useMemo, type ReactNode } from 'react'

import { en } from './i18n-strings'
import { I18nContext } from './i18n-context'

export function I18nProvider({ children }: { children: ReactNode }) {
  /* Constant, so it is built once rather than on every render of the shell.
   *
   * The key itself is returned when a string is missing, which is loud in a
   * screenshot and harmless in production — the alternative, an empty string,
   * is a blank space nobody notices until a student reports it. */
  const value = useMemo(() => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const template = en[key] ?? key
      if (!vars) return template

      return Object.entries(vars).reduce(
        (out, [name, value]) => out.replaceAll(`{${name}}`, String(value)),
        template,
      )
    },
  }), [])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
