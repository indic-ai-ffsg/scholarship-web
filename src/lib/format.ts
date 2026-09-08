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
export type DeadlineState = 'open' | 'soon' | 'today' | 'closed' | 'none'

export function deadlineLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  days: number | undefined,
): { text: string; state: DeadlineState; mark: string } {
  if (days === undefined || days === null) {
    return { text: t('public.noClose'), state: 'none', mark: '\u221e' }
  }
  if (days < 0) return { text: t('public.closed'), state: 'closed', mark: '\u00d7' }
  if (days === 0) return { text: t('public.closesToday'), state: 'today', mark: '!' }
  if (days <= 7) return { text: t('public.closingSoon'), state: 'soon', mark: '!' }
  return { text: t('public.closesIn', { n: days }), state: 'open', mark: '\u2713' }
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
): string {
  if (amount !== undefined && amount !== null) return money(amount)
  if (benefit && benefit.trim()) return benefit.trim()
  // Neither. Said rather than left blank, so a card with no award reads as
  // incomplete data rather than as a rendering fault.
  return t('public.awardUnstated')
}
