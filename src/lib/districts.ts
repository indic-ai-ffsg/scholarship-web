import table from '../data/indian-state-district.json'
import { STATES } from './fields'

/* The districts of a state, for the picker that opens after one is chosen.
 *
 * ---------------------------------------------------------------------------
 * Bundled rather than fetched
 * ---------------------------------------------------------------------------
 *
 * 13.5 KB of JSON, 3.9 KB over the wire once gzip is on — small enough that
 * splitting it out would trade a real failure for an imaginary saving. A fetch
 * here fails in the worst place: a student half way through registration, on a
 * phone, on a connection that has just dropped, facing a required field with an
 * empty list and no way to tell whether the problem is them or us. Bundled, the
 * list is there whenever the form is.
 *
 * ---------------------------------------------------------------------------
 * Keyed by name, not by code
 * ---------------------------------------------------------------------------
 *
 * The profile stores `state_code` — a two-letter code from STATES — and the
 * file is keyed by the state's full name. All 36 names match STATES exactly
 * today, checked before this was written, so the join is a lookup rather than a
 * fuzzy match. It is done in one place, here, so that a name drifting on either
 * side breaks one function rather than a screen.
 *
 * ---------------------------------------------------------------------------
 * The file is incomplete, and this is why the field cannot be required
 * ---------------------------------------------------------------------------
 *
 * Fourteen states are cut off at exactly 25 districts: Uttar Pradesh lists 25
 * of its 75, Madhya Pradesh 25 of 55, Rajasthan 25 of 50, Bihar 25 of 38. That
 * is the shape of a source that was paginated and never paged, not a judgement
 * about which districts matter.
 *
 * So a student from Lucknow or Varanasi opens this picker and their district is
 * not in it. Making the field required would stop them registering — over a
 * data file, for a value nothing in the platform matches on today. It stays
 * optional, and `isTruncated` below lets the picker say so rather than leaving
 * somebody searching for a row that was never there.
 */

interface StateDistricts {
  state: string
  districts: string[]
}

const BY_NAME = new Map<string, string[]>(
  (table as StateDistricts[]).map(s => [s.state, s.districts]),
)

/* The count every truncated state stopped at. A state holding exactly this many
 * is the signature of the cut, which is why it is a named constant rather than
 * a literal buried in a comparison — when the file is replaced with a complete
 * one, this and isTruncated are what should be deleted. */
const TRUNCATED_AT = 25

/** Every district the file knows for a state code, in the order it lists them
 *  (alphabetical). Empty for a code with no entry, which no current code has. */
export function districtsFor(stateCode: string): string[] {
  const name = STATES[stateCode]
  if (!name) return []
  return BY_NAME.get(name) ?? []
}

/* Whether this state's list is one of the fourteen that were cut short.
 *
 * A heuristic, and it says so: a state that genuinely has 25 districts would
 * read as truncated. None of the 36 does today, and the cost of being wrong is
 * one extra sentence under a picker rather than a student blocked — which is
 * the right way round for a guess to fail.
 */
export function isTruncated(stateCode: string): boolean {
  return districtsFor(stateCode).length === TRUNCATED_AT
}
