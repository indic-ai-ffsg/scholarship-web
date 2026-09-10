/* What the student gets, read back as the table the panel wrote.
 *
 * `benefit_description` is a text column holding an optional lead-in, a blank
 * line, then one row per line as `Component — amount`. The panel's editor is a
 * table and this is the other half of that contract — see the note above
 * parseBenefits in admin/src/pages/Scholarships.tsx, which is where the format
 * is decided and which this must not drift from.
 *
 * Three things about the format are load-bearing here:
 *
 * The separator is an em dash with spaces, ' — ', not a hyphen. A hyphen is a
 * character people type inside a fee name — "Merit-cum-means" — so a hyphen
 * would cut rows in half. Only the FIRST separator splits, so an amount that
 * contains one ("₹1,200 a month — hostelers only") stays whole.
 *
 * The amount is free text and must stay that way. "Up to ₹1,40,000 per annum"
 * and "₹1,200 a month for hostelers, ₹650 for day scholars" are both answers a
 * sponsor's table gives, and neither is a number. Anything that tried to parse
 * them into a figure would have to drop the half that carries the meaning.
 *
 * A row that lost its separator degrades into a component with no amount rather
 * than into a parse error, and a column that predates the table format — plain
 * prose an operator typed — comes back as rows with no amounts, which the
 * caller can still print as the paragraph it is. Nothing here throws.
 */

export interface BenefitRow {
  component: string
  amount: string
}

const SEPARATOR = ' — '

/** The lead-in and the rows. Both may be empty; neither is ever null. */
export function parseBenefits(text: string): { intro: string; rows: BenefitRow[] } {
  const blank = text.indexOf('\n\n')
  const head = blank === -1 ? '' : text.slice(0, blank)

  /* A lead-in only when there is a blank line AND what precedes it is not
     itself a row. A table with no lead-in has no blank line to find; one whose
     first line is a real row is all table. */
  const hasIntro = blank !== -1 && head.trim() !== '' && !head.includes(SEPARATOR)

  return {
    intro: hasIntro ? head.trim() : '',
    rows: parseRows(hasIntro ? text.slice(blank + 2) : text),
  }
}

function parseRows(text: string): BenefitRow[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const at = line.indexOf(SEPARATOR)
      /* No separator: the whole line is the component. serialiseBenefits writes
         exactly that for a row whose amount is blank — the separator is only
         written when there is something after it — so this is the ordinary
         shape, not a damaged one.
         *
         * The trailing dash is trimmed anyway. A column edited by hand, or an
         * operator who typed the dash before deciding there was no amount,
         * leaves "Disability allowance —", and the trailing separator loses its
         * space to the line trim above so it is not found by indexOf. Printed
         * as-is it becomes a component name ending in a dash next to an empty
         * cell, which reads as two mistakes rather than one blank. */
      if (at === -1) return { component: line.replace(/\s*[—–-]\s*$/, ''), amount: '' }
      return {
        component: line.slice(0, at).trim(),
        amount: line.slice(at + SEPARATOR.length).trim(),
      }
    })
}

/* Whether this is a table at all.
 *
 * At least one row carrying an amount. Without it the column is prose — either
 * written before the panel's table existed, or a sentence somebody typed into
 * it — and rendering that as a one-column table with an empty second column
 * would be a table asserting there is nothing in the amount, which is worse
 * than the paragraph it actually is.
 */
export function isBenefitTable(rows: BenefitRow[]): boolean {
  return rows.some(r => r.amount !== '')
}
