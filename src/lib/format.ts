/* Presentation helpers.
 *
 * Amounts are rupees read against printed scheme notices, so the Indian
 * numbering system is used throughout: ₹1,00,000 rather than ₹100,000. Pinned
 * to en-IN rather than taking the browser's locale, so two students comparing
 * the same scheme see the same figure.
 */

const RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
})

export const money = (n: number) => RUPEES.format(n)

/* Grouped in the Indian system, matching the currency formatter above: a
 * visitor reading "1,00,000" beside "₹1,00,000" is reading the same shape
 * twice, which is one fewer thing to decode. */
const COUNT = new Intl.NumberFormat('en-IN')
export const count = (n: number) => COUNT.format(n)

export function date(iso: string, lang = 'en') {
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

export function shortDate(iso: string, lang = 'en') {
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso))
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
  if (days <= 7) return { text: t('public.closingSoon'), state: 'soon', mark: URGENT_MARK }
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
   * It keeps the day count rather than becoming "Closing soon". The number is
   * what a reader plans around, and above a week they still have a choice to
   * make rather than a warning to obey. */
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
