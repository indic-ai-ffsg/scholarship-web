import table from '../data/indian-state-district.json'
import { STATES } from './fields'

/* The districts of a state, for the picker that opens after one is chosen.
 *
 * ---------------------------------------------------------------------------
 * Bundled rather than fetched
 * ---------------------------------------------------------------------------
 *
 * 17 KB of JSON, 4.9 KB over the wire once gzip is on — small enough that
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
 * Every district, and why the spellings are the file's own
 * ---------------------------------------------------------------------------
 *
 * Fourteen states used to stop at exactly 25 districts — Uttar Pradesh at 25
 * of its 75 — the shape of a source that was paginated and never paged. The
 * picker carried a typed-district escape for those states. Students were still
 * getting stuck at this field, so the missing districts were filled in from the
 * state-by-state tables (2026-10), and with no state cut short the escape went.
 *
 * Where the two sources spell one district differently, the file's spelling
 * was kept: it is the LGD form, it already carries the renames (Chhatrapati
 * Sambhajinagar, Dharashiv, Narmadapuram, Vijayapura), and it is what students
 * have already saved. So a name moving here is a change to stored values, not
 * a cosmetic one. If a district is missing, add it; do not respell one.
 */

interface StateDistricts {
  state: string
  districts: string[]
}

const BY_NAME = new Map<string, string[]>(
  (table as StateDistricts[]).map(s => [s.state, s.districts]),
)

/** Every district the file knows for a state code, in the order it lists them
 *  (alphabetical). Empty for a code with no entry, which no current code has. */
export function districtsFor(stateCode: string): string[] {
  const name = STATES[stateCode]
  if (!name) return []
  return BY_NAME.get(name) ?? []
}

/* Every district in the file, each with the state it is in.

   For the picker before a state is chosen: registration asks for the district
   above the state, the order an address is written in, so the district has to
   be findable on its own and the state follows from it. A name can belong to
   more than one state — Aurangabad is in Bihar and Maharashtra, Bilaspur in
   Himachal Pradesh and Chhattisgarh — which is why each row carries its state
   rather than the name alone. */
export interface DistrictRow {
  district: string
  stateCode: string
  stateName: string
}

let everyDistrict: DistrictRow[] | null = null

export function allDistricts(): DistrictRow[] {
  everyDistrict ??= Object.entries(STATES)
    .flatMap(([stateCode, stateName]) =>
      (BY_NAME.get(stateName) ?? []).map(district => ({ district, stateCode, stateName })))
    .sort((a, b) => a.district.localeCompare(b.district) || a.stateName.localeCompare(b.stateName))
  return everyDistrict
}
