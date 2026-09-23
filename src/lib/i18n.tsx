/* The copy provider.
 *
 * Component only; the hook lives alongside in i18n-context.ts, the English
 * table in i18n-strings.ts, the other thirteen in strings/, and the registry in
 * locales.ts — because a module exporting both a component and a plain function
 * breaks Fast Refresh.
 *
 * ---------------------------------------------------------------------------
 * What happens before React starts
 * ---------------------------------------------------------------------------
 *
 * The three statements under this comment run when the module is evaluated,
 * which is while the main bundle is still executing and before createRoot has
 * been called. That ordering is the whole performance argument:
 *
 *   - the language is decided from the device without a render,
 *   - <html lang> and <html dir> are correct before a single pixel is painted,
 *     so an Urdu reader never sees a left-to-right frame flip under them,
 *   - and the fetch of their table is already in flight while React is still
 *     building the tree, instead of starting after the first render asks for it.
 *
 * A student whose phone is set to Tamil therefore waits for one small file that
 * was requested in parallel with everything else, not for a round trip bolted
 * onto the end of start-up. A student whose phone is set to English waits for
 * nothing at all: their table is a static import and is already here.
 *
 * This is also why none of it lives in an effect. An effect runs after the
 * first paint, which is exactly one frame too late for both the direction flip
 * and the fetch.
 */

import {
  startTransition, use, useCallback, useEffect, useMemo, useState, type ReactNode,
} from 'react'

import { en, type Dict } from './i18n-strings'
import { I18nContext } from './i18n-context'
import { dirOf, isLocale } from './locales'
import { initialLocale, loadTable, ready, storeLocale } from './i18n-tables'

const INITIAL = initialLocale()
applyToDocument(INITIAL)
void loadTable(INITIAL)

/* <html lang> and <html dir>, which are not decoration.
 *
 * lang is what a screen reader reads the voice table from: without it, VoiceOver
 * and TalkBack pronounce Tamil with an English voice, which is not an accent —
 * it is unintelligible. It is also what a browser's own translate offer and
 * hyphenation key on.
 *
 * dir is what makes the entire layout mirror for Urdu and Kashmiri. Everything
 * in styles.css that positions in the inline direction follows from this one
 * attribute, which is why those properties are logical there and why this is
 * set on the root element rather than on a wrapper. */
function applyToDocument(code: string): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = code
  document.documentElement.dir = dirOf(code)
}

/* Plural selection, delegated to the platform.
 *
 * This used to be `n === 1`, with a comment saying that is English's rule and
 * only English's, and that a language with a third form would be the point to
 * replace it rather than extend it. Fourteen languages is that point.
 *
 * Intl.PluralRules is that replacement, and it is already in the browser —
 * nothing is downloaded for it. It knows, for instance, that Hindi puts zero in
 * the singular ("0 आवेदन", not "0 आवेदनों"), which the old rule got wrong and
 * which no amount of pipe-splitting would have fixed.
 *
 * All fourteen languages here happen to have exactly two forms, so the table's
 * `singular|plural` shape still holds: 'one' takes the left, everything else
 * takes the right. A language with more — Arabic has six — needs a richer
 * separator in the table, and this function is where it would be read. */
const RULES = new Map<string, Intl.PluralRules>()

function isOne(locale: string, n: number): boolean {
  try {
    let rules = RULES.get(locale)
    if (!rules) {
      rules = new Intl.PluralRules(locale)
      RULES.set(locale, rules)
    }
    return rules.select(n) === 'one'
  } catch {
    /* An engine that does not carry data for this language. English's rule is
     * the better guess than always plural. */
    return n === 1
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(INITIAL)

  /* Already in memory, or wait for it.
   *
   * ready() answers synchronously for English and for any language fetched
   * earlier this session, and in both cases nothing suspends — switching back
   * to a language you have already used is instant.
   *
   * Otherwise use() suspends on the promise that was started at module scope
   * above, or in setLocale below. use() rather than an effect and a spinner
   * because an effect would render the whole product in English first and then
   * replace it, and a flash of the wrong language is worse than a held frame:
   * a screen reader announces both. Conditional use() is supported — it is the
   * one thing use() does that the Hooks rules forbid everywhere else. */
  const table: Dict = ready(locale) ?? use(loadTable(locale))

  /* The attribute has to be reasserted after a switch.
   *
   * Set at module scope for the first language and here for every one after.
   * Idempotent, so the duplicate write on mount costs nothing, and in an effect
   * rather than in setLocale because the switch runs inside a transition: the
   * old language stays on screen while the new table downloads, and flipping
   * the document's direction at the moment of the press would mirror the layout
   * around text that has not changed yet. After commit is when both agree. */
  useEffect(() => { applyToDocument(locale) }, [locale])

  const setLocale = useCallback((code: string) => {
    if (!isLocale(code)) return
    /* Started before the state change, so the transition below has something
     * in flight to wait on rather than beginning the fetch a render later. */
    void loadTable(code)
    storeLocale(code)
    /* A transition, so the press does not blank the page.
     *
     * Without it the state change suspends on use() above and the whole app is
     * replaced by the fallback until the table lands — a student pressing
     * "தமிழ்" on a train would watch the site they were reading disappear.
     * Inside one, React keeps the current render on screen and swaps only when
     * the new language is ready, which is the behaviour the press implies. */
    startTransition(() => setLocaleState(code))
  }, [])

  const value = useMemo(() => ({
    locale,
    dir: dirOf(locale),
    setLocale,
    t: (key: string, vars?: Record<string, string | number>) => {
      /* Key by key, not table by table.
       *
       * A language whose table is half-written shows its own words where it has
       * them and English where it does not, rather than the whole product
       * reverting the moment one string is missing. It is the difference
       * between shipping a language at 60% and not shipping it.
       *
       * The key itself is returned when English is missing it too, which is
       * loud in a screenshot and harmless in production — the alternative, an
       * empty string, is a blank space nobody notices until a student reports
       * it. */
      let template = table[key] ?? en[key] ?? key
      if (!vars) return template

      /* "1 application not sent", not "1 applications not sent".
       *
       * A string may carry both forms separated by a pipe — singular first —
       * and the one that agrees with {n} is chosen here, by the rules of the
       * language on screen rather than by English's. See isOne above. */
      if (typeof vars.n === 'number' && template.includes('|')) {
        const [one, many] = template.split('|')
        template = (isOne(locale, vars.n) ? one : many).trim()
      }

      return Object.entries(vars).reduce(
        (out, [name, value]) => out.replaceAll(`{${name}}`, String(value)),
        template,
      )
    },
  }), [locale, table, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
