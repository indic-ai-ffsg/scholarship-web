/* The fourteen languages, and how the device's own setting is read.
 *
 * No React, no JSX and no string table in here on purpose: index.html, the
 * provider, the switcher and the formatters all need to know what a language
 * is, and a module that only answers that can be imported by any of them
 * without dragging the others in.
 *
 * ---------------------------------------------------------------------------
 * Why fourteen, and why these fourteen
 * ---------------------------------------------------------------------------
 *
 * English, Hindi and the twelve Eighth Schedule languages this platform's
 * students actually write their certificates in. It is not every scheduled
 * language — Sanskrit, Sindhi, Konkani, Manipuri, Bodo, Santali, Dogri, Nepali
 * and Marathi are absent, and that is a list of the next ones rather than a
 * judgement about them. Adding one is a file in strings/ and a row here.
 */

export type Dir = 'ltr' | 'rtl'

export interface Locale {
  /** BCP 47 primary subtag. Also the filename in strings/ and the value of
   *  <html lang>, so it cannot be invented — it is what Intl and every screen
   *  reader's voice table are keyed on. */
  code: string
  /** The name in its own script, which is the only name a reader looking for
   *  their language can be relied on to recognise. A list that says "Tamil" to
   *  somebody who reads only Tamil has hidden the thing it is for. */
  name: string
  /** The same name in English. Never rendered as the label; it is the
   *  accessible name, so that a reader whose screen reader is speaking English
   *  hears "Tamil" rather than an English voice attempting தமிழ். */
  english: string
  dir: Dir
}

/* English and Hindi first — the pair the product launched with and the pair
 * every fallback lands on — then the rest alphabetically by their English
 * name.
 *
 * Alphabetical by English is meaningless to a reader who only reads Odia, and
 * it is still the right order: it never changes. Sorting by native name would
 * mean collating fourteen scripts against each other, which no collation
 * defines and which would reorder the list depending on who is reading it. A
 * fixed position is worth more than a sorted one to anybody who reaches this
 * control twice, and worth a great deal to anybody driving it by switch or
 * head pointer. */
export const LOCALES: readonly Locale[] = [
  { code: 'en',  name: 'English',    english: 'English',   dir: 'ltr' },
  { code: 'hi',  name: 'हिन्दी',       english: 'Hindi',     dir: 'ltr' },
  { code: 'as',  name: 'অসমীয়া',      english: 'Assamese',  dir: 'ltr' },
  { code: 'bn',  name: 'বাংলা',        english: 'Bengali',   dir: 'ltr' },
  { code: 'gu',  name: 'ગુજરાતી',      english: 'Gujarati',  dir: 'ltr' },
  { code: 'kn',  name: 'ಕನ್ನಡ',        english: 'Kannada',   dir: 'ltr' },
  /* Perso-Arabic, which is the script Kashmiri is officially written in and
   * the reason this row is rtl. Kashmiri is also written in Devanagari, and a
   * device asking for ks-Deva gets this table and this direction, which is
   * wrong for that reader. Fixing it properly means a second table keyed on
   * the script subtag rather than the language; until somebody asks, the
   * official script is the better single answer. */
  { code: 'ks',  name: 'کٲشُر',        english: 'Kashmiri',  dir: 'rtl' },
  { code: 'mai', name: 'मैथिली',       english: 'Maithili',  dir: 'ltr' },
  { code: 'ml',  name: 'മലയാളം',      english: 'Malayalam', dir: 'ltr' },
  { code: 'or',  name: 'ଓଡ଼ିଆ',         english: 'Odia',      dir: 'ltr' },
  /* Gurmukhi. Shahmukhi (pa-Arab) is the Pakistani script and is right-to-left;
   * same trade as Kashmiri above, and the same reason to take the Indian one. */
  { code: 'pa',  name: 'ਪੰਜਾਬੀ',       english: 'Punjabi',   dir: 'ltr' },
  { code: 'ta',  name: 'தமிழ்',        english: 'Tamil',     dir: 'ltr' },
  { code: 'te',  name: 'తెలుగు',       english: 'Telugu',    dir: 'ltr' },
  { code: 'ur',  name: 'اردو',         english: 'Urdu',      dir: 'rtl' },
]

/* The table that is compiled into the main bundle rather than fetched, the one
 * every other language falls back to key by key, and what an unrecognised
 * device setting resolves to. Three jobs, one language, and they have to be the
 * same language or a missing string has nowhere to land. */
export const DEFAULT_LOCALE = 'en'

const BY_CODE = new Map(LOCALES.map(l => [l.code, l]))

export const isLocale = (code: string): boolean => BY_CODE.has(code)

export const localeOf = (code: string): Locale =>
  BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_LOCALE)!

export const dirOf = (code: string): Dir => localeOf(code).dir

/* navigator.language values that are the same language under another name.
 *
 * Browsers overwhelmingly send the two-letter subtag, so this is short and is
 * not an attempt at the full ISO 639-2/639-3 mapping. What it does cover is the
 * cases seen on Indian handsets: the bibliographic three-letter codes some
 * Android builds still emit, and Odia's pre-2011 name, which is what an older
 * device calls the language its user would call ଓଡ଼ିଆ. */
const ALIASES: Record<string, string> = {
  asm: 'as',
  ben: 'bn',
  guj: 'gu',
  hin: 'hi',
  kan: 'kn',
  kas: 'ks',
  mal: 'ml',
  ori: 'or',
  ory: 'or',
  /* "Oriya" was the spelling until the constitutional amendment of 2011 and is
   * still what some locale databases carry. Same language. */
  oriya: 'or',
  pan: 'pa',
  pun: 'pa',
  tam: 'ta',
  tel: 'te',
  urd: 'ur',
}

/* One BCP 47 tag to one of ours, or null.
 *
 * Only the primary subtag is read, so bn-IN and bn-BD both give Bengali. That
 * is deliberate: the difference between them is spelling conventions this table
 * does not distinguish, and a reader who gets Bengali instead of nothing is
 * better served. The exception is written above at ks and pa, where the script
 * subtag really does change which script to draw — and is still ignored,
 * because there is one table per language here. */
export function normalise(tag: string): string | null {
  const primary = tag.toLowerCase().split(/[-_]/)[0]
  if (!primary) return null
  const code = ALIASES[primary] ?? primary
  return BY_CODE.has(code) ? code : null
}

/* The device's own setting, in the device's own order of preference.
 *
 * navigator.languages is the full ordered list from the operating system, and
 * it is what "system language" means on every platform this runs on: a phone
 * set to Tamil with English second sends ['ta-IN', 'en-IN'] and gets Tamil. It
 * is read rather than navigator.language alone because the singular property is
 * only the first entry, and the first entry can easily be a language we do not
 * carry while the second is one we do.
 *
 * Nothing is asked of the network and nothing is asked of the student. A first
 * visit is already in their language if their phone is, which is the whole
 * point — the switcher below exists for the case where it is not, not as the
 * way in. */
export function detectLocale(
  tags: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [],
): string {
  for (const tag of tags) {
    const code = normalise(tag)
    if (code) return code
  }
  return DEFAULT_LOCALE
}
