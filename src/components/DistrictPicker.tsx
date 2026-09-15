import { useEffect, useMemo, useRef, useState } from 'react'

import { Sheet } from './Sheet'
import { districtsFor, isTruncated } from '../lib/districts'

/* Choosing a district, in a sheet, after the state is known.
 *
 * A sheet rather than the SearchableSelect the state above it uses, and the
 * reason is the list: a state has up to seventy-five districts with names a
 * student may not be sure how to spell — Chhatrapati Sambhajinagar, Sri Potti
 * Sriramulu Nellore — and a combobox dropdown on a phone shows four of them
 * above the keyboard. The sheet gives the list the whole screen, which is what
 * a long unfamiliar list needs.
 *
 * Search filters on `includes` rather than a prefix, because the part of the
 * name somebody is sure of is often not the start of it: "Nellore" finds "Sri
 * Potti Sriramulu Nellore", where a prefix match would find nothing and read as
 * "your district is not here".
 *
 * ---------------------------------------------------------------------------
 * Why a truncated state can be typed into
 * ---------------------------------------------------------------------------
 *
 * The field is required, and the data file is missing half of several states —
 * Uttar Pradesh lists 25 of its 75 districts, Madhya Pradesh 25 of 55. Those
 * two facts together are a registration blocker for anybody from Lucknow,
 * Varanasi or Kanpur: a required field they cannot satisfy, on a form they
 * cannot skip, for a scholarship platform whose users are students with
 * disabilities. That is not a trade worth making over a JSON file.
 *
 * So on a truncated state, and ONLY on a truncated state, the sheet also lets
 * the district be typed. The column is text(80) and the value is not matched on
 * by anything today, so a typed district costs nothing a picked one does not;
 * what it buys is that the field can be required at all.
 *
 * On a complete state there is no free-text escape, deliberately. Offering one
 * everywhere would reopen the spelling fragmentation a closed list exists to
 * prevent — "Ernakulam", "ernakulam", "Ernakulm" — for the fourteen states
 * where the list is genuinely the whole answer.
 *
 * When the file is replaced with a complete one, isTruncated returns false
 * everywhere and this path disappears on its own.
 */
export function DistrictPicker({
  id, stateCode, value, onChange, describedBy, invalid,
}: {
  id: string
  /** Empty until a state is chosen; the control stays disabled until then. */
  stateCode: string
  value: string
  onChange: (district: string) => void
  describedBy?: string
  /** Mirrors the aria-invalid the other controls get from Field, which cannot
   *  reach a button through its render prop. */
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  /* Typing a district the file does not have. Only reachable on a truncated
     state; see the note above. */
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const search = useRef<HTMLInputElement>(null)

  const districts = useMemo(() => districtsFor(stateCode), [stateCode])
  const partial = isTruncated(stateCode)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return districts
    return districts.filter(d => d.toLowerCase().includes(q))
  }, [districts, query])

  /* Focus the search box once the sheet is actually on screen.
     rAF rather than a bare call: <dialog> is shown by an effect in Sheet, and
     focusing an element that is still display:none does nothing. */
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => search.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  /* Opening clears the last search, and it is done HERE rather than in an
     effect on close — an effect would be a setState reacting to a state this
     component already owns, which is the round trip the lint rule exists to
     stop. Reopening to the previous query is the wrong default anyway: somebody
     coming back is correcting the answer, not resuming the hunt for it. */
  function openSheet() {
    setQuery('')
    setTyping(false)
    setTyped('')
    setOpen(true)
  }

  function saveTyped() {
    const name = typed.trim()
    if (name) choose(name)
  }

  function choose(district: string) {
    onChange(district)
    setOpen(false)
  }

  return (
    <>
      {/* A button, not an input. Nothing here is typed — the value is always
          one of the rows — and a text box invites typing that would be thrown
          away. `aria-haspopup="dialog"` says what pressing it does. */}
      <button
        id={id}
        type="button"
        className="select-like"
        disabled={!stateCode}
        aria-haspopup="dialog"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onClick={openSheet}
      >
        {value || (stateCode ? 'Choose your district' : 'Choose your state first')}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Choose your district">
        <div className="district-picker">
          <label className="sr-only" htmlFor={`${id}-q`}>Search districts</label>
          <input
            id={`${id}-q`}
            ref={search}
            type="search"
            /* Not type="text": the clear affordance and the phone keyboard that
               comes with search both belong here. autoComplete off because the
               browser's saved values are addresses, not this list. */
            autoComplete="off"
            placeholder="Search districts"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />

          {/* Said before the list rather than after it, so somebody who cannot
              find their district reads the explanation instead of concluding
              the form is broken. Only on the states it is true of. */}
          {partial && !typing && (
            <div className="district-partial">
              <p className="muted">
                This list does not have every district in your state yet.
              </p>
              {/* Its own control on its own line rather than a link inside the
                  sentence. A text link here would be a sub-48px target in the
                  one place somebody has already failed once — and this is the
                  only way forward for them, so it has to be the easiest thing
                  on the screen to hit, not the hardest. */}
              <button type="button" className="quiet" onClick={() => setTyping(true)}>
                Type your district instead
              </button>
            </div>
          )}

          {/* The escape hatch, and it replaces the list rather than sitting
              under it: somebody who has got here has already failed to find
              their district, and leaving 25 wrong answers on screen invites
              them to settle for the nearest one. */}
          {typing && (
            <div className="district-typed">
              <label htmlFor={`${id}-typed`}>Your district</label>
              <input
                id={`${id}-typed`}
                autoFocus
                maxLength={80}
                value={typed}
                placeholder="For example, Lucknow"
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return
                  // The sheet is inside the registration form; Enter here must
                  // save the district, not submit the whole form.
                  e.preventDefault()
                  saveTyped()
                }}
              />
              <div className="district-typed-actions">
                <button type="button" onClick={() => setTyping(false)}>Back to the list</button>
                <button
                  type="button"
                  className="primary"
                  disabled={!typed.trim()}
                  onClick={saveTyped}
                >
                  Use this district
                </button>
              </div>
            </div>
          )}

          {!typing && (
          <p className="sr-only" role="status">
            {matches.length} district{matches.length === 1 ? '' : 's'}
            {query.trim() ? ' matching your search' : ''}
          </p>
          )}

          {typing ? null : matches.length === 0 ? (
            <p className="muted">
              No district matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="district-list">
              {matches.map(d => (
                <li key={d}>
                  <button
                    type="button"
                    className={d === value ? 'is-on' : undefined}
                    aria-pressed={d === value}
                    onClick={() => choose(d)}
                  >
                    {d}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
    </>
  )
}
