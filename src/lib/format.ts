/* Presentation helpers.
 *
 * Amounts are rupees read against printed scheme notices, so the Indian
 * numbering system is used throughout: ₹1,00,000 rather than ₹100,000. Pinned
 * to en-IN rather than taking the browser's locale, so two students comparing
 * the same scheme see the same figure.
 *
 * That pinning is for the figures and not for the dates, and the difference is
 * worth stating because the two look like the same decision. A rupee amount is
 * a quantity being checked against a printed notice, and it has to read the
 * same to everybody; a date is prose, and a Tamil page that says "15 January
 * 2027" in the middle of a Tamil sentence has switched language mid-sentence.
 * So money and count stay en-IN, and the three date formatters below follow the
 * language on screen.
 */

import { isLocale } from './locales'

const RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
})

export const money = (n: number) => RUPEES.format(n)

/* Grouped in the Indian system, matching the currency formatter above: a
 * visitor reading "1,00,000" beside "₹1,00,000" is reading the same shape
 * twice, which is one fewer thing to decode. */
const COUNT = new Intl.NumberFormat('en-IN')
export const count = (n: number) => COUNT.format(n)

/* The BCP 47 tag the date formatters ask Intl for.
 *
 * -IN on every one of the fourteen, because the regional half of the tag is
 * what decides day-before-month and the 12-hour clock, and this platform's
 * readers are in India whichever language they read in. An unrecognised code
 * falls back to en-IN rather than being passed through: Intl throws a
 * RangeError on a malformed tag, and a date is not worth an exception.
 *
 * Intl carries its own data for all fourteen, so nothing is downloaded and
 * nothing is translated here — the month name in Odia comes from the browser. */
const dateLocale = (lang: string): string =>
  isLocale(lang) ? `${lang}-IN` : 'en-IN'

export function date(iso: string, lang = 'en') {
  return new Intl.DateTimeFormat(dateLocale(lang), {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

export function shortDate(iso: string, lang = 'en') {
  return new Intl.DateTimeFormat(dateLocale(lang), {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

/* A date with the time on it, for a record of something that happened.
 *
 * shortDate above answers "when is this due"; this answers "when did I send
 * it", and those want different precision. A student checking whether their
 * application went through wants to recognise the moment they pressed the
 * button — the date alone leaves them wondering whether the second attempt
 * counted, which is exactly the doubt an application list exists to settle.
 *
 * en-IN, so the clock is the 12-hour one people here read, with the date first.
 */
export function dateTime(iso: string, lang = 'en') {
  return new Intl.DateTimeFormat(dateLocale(lang), {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

/* A server label, capitalised for use as a heading.
 *
 * workflow.Human returns "document check" in lower case and is right to: it is
 * built to sit inside a sentence — "moved to document check" — and most of its
 * call sites do exactly that. Standing alone at the head of a timeline entry it
 * reads as unfinished, which is what a column of lower-case stage names looked
 * like.
 *
 * Only the first character is touched. An organisation that renamed a stage to
 * "send to finance" keeps its own words, and a label that already begins with a
 * capital is returned unchanged — so this cannot fight a custom label, only
 * tidy one that was written for a different position in a sentence.
 */
export function sentenceCase(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/** File sizes, for the document list. */
export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Turns SCREAMING_SNAKE into prose, leaving short acronyms alone. */
export function humanise(value: string) {
  if (!value) return ''
  if (value.length <= 5 && !value.includes('_') && value === value.toUpperCase()) return value

  const words = value.toLowerCase().split('_').filter(Boolean)
  if (!words.length) return value
  return words[0][0].toUpperCase() + words[0].slice(1)
    + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '')
}

/* How a closing date is written, including when there is not one.
 *
 * One function because six screens showed the same countdown and each would
 * otherwise need its own answer to "what if there is no date" — which is a real
 * state since backend 0043: a curated listing is allowed not to know this
 * year's window, and the directory shows those rather than hiding them.
 *
 * The absent case must not fall through to a number. `days_remaining` used to
 * be computed from a zero date and came out around minus 740,000, which reads
 * as "closed" on one screen and "closing soon" on another depending on which
 * threshold it crosses first. Undefined in, "No closing date" out, and `soon`
 * false — an open-ended scheme is not urgent.
 *
 * `t` is passed rather than imported: this file is pure formatting and has no
 * business holding a hook.
 */
/* Four states, not two, and each one wears a mark as well as a colour.
 *
 * It returned `soon` and nothing else, so a deadline was either red or it was
 * not — and red was the only signal, which is the one thing this file's own
 * rules forbid: colour never carries meaning alone. Every other status here is
 * a colour and a shape together (see stateMark, .state-badge), and this was the
 * exception.
 *
 * The two states it did not have are the two that matter most. `days <= 7`
 * swallowed 0 and every negative, so a scheme closing this afternoon and one
 * that shut a fortnight ago both read "Closing soon" — an invitation, in the
 * case where the answer is that it is too late. They are separate now.
 */
export type DeadlineState = 'open' | 'closing' | 'soon' | 'today' | 'closed' | 'none'

/* The mark on an urgent deadline.
 *
 * A clock rather than the "!" it was until 2026-09-10. Both are aria-hidden and
 * say nothing to a screen reader — the text carries the whole announcement —
 * so this is purely what the eye catches, and a clock names the thing being
 * measured where an exclamation mark only insists.
 *
 * Written as the escape rather than the glyph so it survives a file being
 * re-saved in the wrong encoding, which is how the rest of the marks here are
 * written. U+23F0 renders in colour on every platform that has it, so it does
 * not take the danger red the words beside it do — that is the trade for
 * choosing an emoji, and the red is still on the text where the meaning is.
 */
const URGENT_MARK = '\u23f0'

export function deadlineLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  days: number | undefined,
): { text: string; state: DeadlineState; mark: string } {
  if (days === undefined || days === null) {
    return { text: t('public.noClose'), state: 'none', mark: '\u221e' }
  }
  if (days < 0) return { text: t('public.closed'), state: 'closed', mark: '\u00d7' }
  if (days === 0) return { text: t('public.closesToday'), state: 'today', mark: URGENT_MARK }
  /* The last week keeps the count too. It said "Closing soon", which is the
   * one phrasing that tells the reader nothing they can act on — soon is a
   * mood, and "Closes in 3 days" is a plan. The urgency is already carried by
   * the state and the mark; the words can afford to be exact. */
  if (days <= 7) return { text: t('public.closesIn', { n: days }), state: 'soon', mark: URGENT_MARK }
  /* Eight to thirty days: the count, in the warning ink.
   *
   * A band rather than colouring every dated scheme, and the difference is the
   * one i18n-strings.ts argues for at 'home.closing' — a directory whose
   * nearest deadline is a year out, painted red, is manufactured urgency, and
   * on a site whose readers are deciding whether to spend twenty minutes on a
   * form they may not qualify for that costs trust which is not cheap to get
   * back. Thirty days is the last month, which for a scholarship application —
   * certificates to gather, a form to sit down with — is genuinely the point at
   * which leaving it is a risk.
   *
   * It keeps the day count, as every dated band now does. The number is what
   * a reader plans around. */
  if (days <= 30) return { text: t('public.closesIn', { n: days }), state: 'closing', mark: URGENT_MARK }
  /* Past a month: the count, and no colour at all.
   *
   * It was the eligible green with a tick, which read as reassurance about a
   * deadline — a tick beside "Closes in 300 days" is the card congratulating
   * the reader for nothing. Neutral says the same fact without an opinion. */
  return { text: t('public.closesIn', { n: days }), state: 'open', mark: '' }
}

/* What the student gets, in one line.
 *
 * A scholarship's award is not always a sum. The scheme published on
 * 2026-09-07 gives a laptop: `award_amount` is null and `benefit_summary`
 * carries "Laptop / Laptop for educational and career preparation". Every card
 * on the site rendered `money(award_amount)` unconditionally, which for that
 * scheme printed nothing at all — after the API had already returned 500 on the
 * whole directory for the same null.
 *
 * The order matters. A figure wins when there is one, because "₹50,000" is what
 * a student is scanning for; the benefit line is the fallback, not a
 * supplement. Showing both would double the width of the busiest row on the
 * card for the minority of schemes that have both.
 *
 * Coalescing to 0 upstream would have been less code and a lie: "₹0" reads as a
 * scholarship worth nothing.
 */
export function awardLabel(
  t: (key: string) => string,
  amount: number | undefined,
  benefit?: string,
  /* The two ends of a stated range, when the scheme has one.
   *
   * Taken before the single figure, which is the opposite of the order the
   * other two arguments are in and is deliberate: award_amount for a scheme
   * that states a range is whichever end the operator picked, and showing it
   * alone is the understatement or the overstatement backend 0047 added these
   * columns to stop. Where a range exists it is the truer answer.
   *
   * Both ends required. One alone — a floor with no ceiling — is not a range a
   * student can plan around, and "from ₹20,000" invites reading the floor as
   * the award, which is the overstatement in reverse. It falls through to the
   * single figure, which is at least a number somebody entered on purpose. */
  min?: number,
  max?: number,
): string {
  if (min != null && max != null && max > min) return `${money(min)} – ${money(max)}`
  if (amount !== undefined && amount !== null) return money(amount)
  if (benefit && benefit.trim()) return benefit.trim()
  // Neither. Said rather than left blank, so a card with no award reads as
  // incomplete data rather than as a rendering fault.
  return t('public.awardUnstated')
}

/* Free text that is really a list, split back into its items.
 *
 * `benefit_description` and `application_process` are textareas in the admin
 * panel captioned "one per line" and "the steps, in order", and operators fill
 * them in that way — but the public sheet rendered them as one paragraph with
 * `white-space: pre-line`, which draws the line breaks and nothing else. Six
 * application steps arrived as a six-line block of text with no spacing, no
 * markers, and no list semantics for a screen reader to announce a count from.
 *
 * Returns [] for anything that is genuinely one paragraph, so the caller can
 * fall back to a <p> rather than wrapping a sentence in a one-item list.
 */
export function asLines(text: string): string[] {
  const items = text.split('\n').map(l => l.trim()).filter(Boolean)
  return items.length > 1 ? items : []
}

/* The author's own numbering, removed so an <ol> does not print a second one.
 *
 * Only when EVERY line carries it. A block where three lines of six begin with
 * a number is not a numbered list with gaps — it is prose that happens to cite
 * a figure, and stripping there would eat the "2." out of "2. 5 lakh".
 */
const NUMBERED = /^\d+[.)]\s+/
export function stripNumbering(items: string[]): string[] {
  return items.every(i => NUMBERED.test(i))
    ? items.map(i => i.replace(NUMBERED, ''))
    : items
}

/* The sponsor's kind, in the words the directory uses.
 *
 * Shared by the matched list and the directory's rows, which badge it the same
 * way; it lived in Matches until the directory needed it too.
 *
 * humanise() would give "Ngo" for NGO — it title-cases anything longer than
 * five characters — and an initialism rendered as a word is the kind of small
 * wrongness that makes a page look machine-written. The map is four entries and
 * exact; anything unrecognised falls through to humanise rather than to a
 * blank, because a new org type should show up as itself rather than vanish. */
const ORG_KIND = new Set(['NGO', 'CORPORATE', 'GOVERNMENT', 'GOVT', 'PRIVATE'])

/* The set is membership only; the words are field.orgKind.* in the string
   table, because "Corporate" on a Hindi page is the same failure as twenty-one
   English disability types were. GOVT and GOVERNMENT share one key: the enum
   has carried both spellings and they name one thing. */
export const orgKind = (t: (key: string) => string, value: string) =>
  ORG_KIND.has(value) ? t(`field.orgKind.${value === 'GOVT' ? 'GOVERNMENT' : value}`) : humanise(value)

/* The kind as a stable key for styling — one spelling per kind, so GOVT and
   GOVERNMENT get one colour — or undefined for a kind this file does not know,
   which then takes the neutral badge rather than a guessed hue. */
export const orgKindKey = (value?: string) =>
  value && ORG_KIND.has(value) ? (value === 'GOVT' ? 'GOVERNMENT' : value).toLowerCase() : undefined
