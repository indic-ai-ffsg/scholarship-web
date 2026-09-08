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
      let template = en[key] ?? key
      if (!vars) return template

      /* "1 application not sent", not "1 applications not sent".
       *
       * A string may carry both forms separated by a pipe — singular first —
       * and the one that agrees with {n} is chosen here. Written out, the three
       * on the dashboard alone read "1 more need one thing", "2 application not
       * sent" and "2 document expiring soon": the table had one form per string
       * and a count that does not always match it.
       *
       * n === 1 is English's rule and only English's. A second language needs
       * its own, and Hindi's is the same two-form split, so this holds for the
       * table that exists — but a language with three forms needs more than a
       * pipe, and that is the point to replace this rather than extend it. */
      if (typeof vars.n === 'number' && template.includes('|')) {
        const [one, many] = template.split('|')
        template = (vars.n === 1 ? one : many).trim()
      }

      return Object.entries(vars).reduce(
        (out, [name, value]) => out.replaceAll(`{${name}}`, String(value)),
        template,
      )
    },
  }), [])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
