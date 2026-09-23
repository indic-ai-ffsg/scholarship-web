/* Fetching a language, and remembering which one.
 *
 * ---------------------------------------------------------------------------
 * Why thirteen dynamic imports written out by hand
 * ---------------------------------------------------------------------------
 *
 * Because that is what makes them thirteen separate files on the network. A
 * template literal — import(`./strings/${code}`) — is one line instead of
 * thirteen and costs a reader every language: the bundler cannot know which
 * one will be asked for, so it emits the lot and the student in Guwahati pays
 * for Malayalam, Tamil and eleven more. Written out, each is its own chunk and
 * exactly one of them is ever fetched.
 *
 * English is not in this map. It is a static import in i18n-strings.ts, so it
 * is already in the main bundle by the time any of this runs — which is the
 * only reason a missing string can be filled in synchronously, and the reason
 * an English reader's first paint costs nothing at all.
 */

import type { Dict } from './i18n-strings'
import { DEFAULT_LOCALE, detectLocale, isLocale } from './locales'

const LOADERS: Record<string, () => Promise<{ default: Dict }>> = {
  as: () => import('./strings/as'),
  bn: () => import('./strings/bn'),
  gu: () => import('./strings/gu'),
  hi: () => import('./strings/hi'),
  kn: () => import('./strings/kn'),
  ks: () => import('./strings/ks'),
  mai: () => import('./strings/mai'),
  ml: () => import('./strings/ml'),
  or: () => import('./strings/or'),
  pa: () => import('./strings/pa'),
  ta: () => import('./strings/ta'),
  te: () => import('./strings/te'),
  ur: () => import('./strings/ur'),
}

/* Both caches are module-level rather than provider state, and have to be.
 *
 * The promise cache is what makes use() safe: React calls a component that
 * suspends more than once, and a fresh promise on each call would suspend
 * again on every one of them and never settle. Same promise in, same promise
 * out, and the second render reads the resolved value instead of waiting.
 *
 * The table cache is what lets a language already on the device render without
 * a frame of anything else — see ready() below. */
const pending = new Map<string, Promise<Dict>>()
const loaded = new Map<string, Dict>()

/* The table, or a promise of it. Never throws.
 *
 * A language that fails to arrive — an aeroplane, a tunnel, a chunk that 404s
 * because the container was replaced mid-session — resolves to an empty table
 * and therefore to English, key by key, in the provider. The alternative is an
 * error boundary over the whole product because one file did not download,
 * which is a worse answer to a slow train than a page in the wrong language.
 * It is also recoverable: the failure is not cached, so the next switch tries
 * the network again. */
export function loadTable(code: string): Promise<Dict> {
  if (code === DEFAULT_LOCALE || !LOADERS[code]) return Promise.resolve({})

  const already = pending.get(code)
  if (already) return already

  const promise = LOADERS[code]()
    .then(module => {
      loaded.set(code, module.default)
      return module.default
    })
    .catch(() => {
      pending.delete(code)
      return {} as Dict
    })

  pending.set(code, promise)
  return promise
}

/** The table if it is already in memory, otherwise null. Lets the provider
 *  skip suspending for a language that has been loaded once this session. */
export const ready = (code: string): Dict | null =>
  code === DEFAULT_LOCALE ? {} : loaded.get(code) ?? null

/* ---------------------------------------------------------------------------
 * Which language, and who decided
 * ------------------------------------------------------------------------ */

const STORAGE_KEY = 'indic.lang'

/* Every access is wrapped, because reading localStorage is not a read.
 *
 * It throws outright in a Safari private window and under a third-party cookie
 * block, and an exception here would take down the module before the app has
 * rendered a character. A student who cannot store a preference should get a
 * site that follows their phone's language instead of a site that does not
 * load. */
export function storedLocale(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && isLocale(saved) ? saved : null
  } catch {
    return null
  }
}

export function storeLocale(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* Ignored. The choice still applies for this session — it is held in React
     * state — and is simply forgotten on the next visit, which is the same
     * behaviour as a first visit and is not worth telling anybody about. */
  }
}

/* A stored choice beats the device, and the absence of one means the device.
 *
 * There is deliberately no third "automatic" setting in the switcher. It would
 * have to be the selected option on a first visit, which means a control whose
 * value reads "Automatic" to somebody who is looking at it to find out what
 * language the page is in — the one question it exists to answer. Not choosing
 * is the automatic setting; choosing turns it off. */
export const initialLocale = (): string => storedLocale() ?? detectLocale()
