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
