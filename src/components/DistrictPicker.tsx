import { useEffect, useMemo, useRef, useState } from 'react'

import { Sheet } from './Sheet'
import { allDistricts, districtsFor, type DistrictRow } from '../lib/districts'

/* Choosing a district, in a sheet.
 *
 * Before a state is chosen it searches every district in the country, each row
 * naming its state, and picking one answers the state too (onState). The form
 * asks for the district above the state — the order an address is written in —
 * so it cannot wait for the state the way it used to: it sat disabled at the
 * top of the address reading "choose your state below first", which is a
 * control that looks broken. Once a state is chosen it lists that state alone.
 *
 * A sheet rather than a combobox — and StatePicker, below it, is the same
 * control for the same reason. The reason is the list: a state has up to seventy-five districts with names a
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
 * There is no free-text escape. The field is required, and that is only fair
 * because the list is complete (lib/districts says how it got that way). A
 * typed box would reopen the spelling fragmentation a closed list exists to
 * prevent — "Ernakulam", "ernakulam", "Ernakulm". There used to be one for the
 * states the file cut short. If a district turns out to be missing, the fix is
 * a row in the data file, not a way round it.
 */
export function DistrictPicker({
  id, stateCode, value, onChange, onState, describedBy, invalid,
}: {
  id: string
  /** Empty until a state is chosen; the list is then every state's. */
  stateCode: string
  value: string
  onChange: (district: string) => void
  /** The state of a district picked before any state was chosen. */
  onState: (stateCode: string) => void
  describedBy?: string
  /** Mirrors the aria-invalid the other controls get from Field, which cannot
   *  reach a button through its render prop. */
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)
  const control = useRef<HTMLButtonElement>(null)

  const rows = useMemo<DistrictRow[]>(
    () => (stateCode
      ? districtsFor(stateCode).map(district => ({ district, stateCode, stateName: '' }))
      : allDistricts()),
    [stateCode],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.district.toLowerCase().includes(q))
  }, [rows, query])

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
    setOpen(true)
  }

  function choose(district: string, inState = stateCode) {
    // The state first: the form clears the district when the state changes.
    if (inState !== stateCode) onState(inState)
    onChange(district)
    setOpen(false)
  }

  return (
    <>
      {/* A button, not an input. Nothing here is typed — the value is always
          one of the rows — and a text box invites typing that would be thrown
          away. `aria-haspopup="dialog"` says what pressing it does. */}
      <div className="district-control">
      <button
        id={id}
        ref={control}
        type="button"
        className={value ? 'select-like' : 'select-like is-empty'}
        aria-haspopup="dialog"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onClick={openSheet}
      >
        {value || 'Choose your district'}
      </button>
      {/* Clear, once there is something to clear. The state goes with it, as
          the district goes with the state's Clear: the two are one answer, and
          two Clears that undo different amounts are one too many to learn. It
          also puts the list back to every state's, so a district picked in
          the wrong state can be found again from the top. Focus goes back to
          the control, because the button that had it has just gone. */}
      {value && (
        <button
          type="button"
          className="district-clear"
          onClick={() => { onChange(''); onState(''); control.current?.focus() }}
        >
          Clear<span className="sr-only"> district</span>
        </button>
      )}
      </div>

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

          <p className="sr-only" role="status">
            {matches.length} district{matches.length === 1 ? '' : 's'}
            {query.trim() ? ' matching your search' : ''}
          </p>

          {matches.length === 0 ? (
            <p className="muted">
              No district matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="district-list">
              {matches.map(r => (
                <li key={`${r.stateCode}:${r.district}`}>
                  <button
                    type="button"
                    className={r.district === value && r.stateCode === stateCode ? 'is-on' : undefined}
                    aria-pressed={r.district === value && r.stateCode === stateCode}
                    onClick={() => choose(r.district, r.stateCode)}
                  >
                    {r.district}
                    {r.stateName && <span className="district-state">, {r.stateName}</span>}
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
