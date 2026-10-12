import { useEffect, useMemo, useRef, useState } from 'react'

import { Sheet } from './Sheet'
import type { Choice } from '../lib/fields'

/* Choosing a state, in a sheet — the same control as the district above it.
 *
 * It was a SearchableSelect, a combobox, while the district beside it was a
 * button that opens a sheet. Two questions about one address, answered two
 * different ways, one with a Clear and one without: the pair read as unrelated
 * fields, and a student who learnt one had to learn the other. Now they are
 * one control twice. The district's note on why a sheet suits a long list
 * applies here too: thirty-six names, several a student may not be sure how
 * to spell.
 *
 * Clearing the state clears the district with it, for the reason changing it
 * does: the district belonged to the state. The district's Clear clears both
 * the same way, so either Clear starts the address's place over. The form owns that rule; this
 * only reports an empty value. */
export function StatePicker({
  id, options, value, onChange, describedBy, invalid,
}: {
  id: string
  options: Choice[]
  value: string
  onChange: (stateCode: string) => void
  describedBy?: string
  /** Mirrors the aria-invalid the other controls get from Field, which cannot
   *  reach a button through its render prop. */
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)
  const control = useRef<HTMLButtonElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  // See DistrictPicker: <dialog> is shown by an effect in Sheet.
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => search.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  function openSheet() {
    setQuery('')
    setOpen(true)
  }

  function choose(code: string) {
    onChange(code)
    setOpen(false)
  }

  const label = options.find(o => o.value === value)?.label

  return (
    <>
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
          {label || 'Choose your state'}
        </button>
        {value && (
          <button
            type="button"
            className="district-clear"
            onClick={() => { onChange(''); control.current?.focus() }}
          >
            Clear<span className="sr-only"> state</span>
          </button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Choose your state">
        <div className="district-picker">
          <label className="sr-only" htmlFor={`${id}-q`}>Search states</label>
          <input
            id={`${id}-q`}
            ref={search}
            type="search"
            autoComplete="off"
            placeholder="Search states"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />

          <p className="sr-only" role="status">
            {matches.length} state{matches.length === 1 ? '' : 's'}
            {query.trim() ? ' matching your search' : ''}
          </p>

          {matches.length === 0 ? (
            <p className="muted">
              No state matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="district-list">
              {matches.map(o => (
                <li key={o.value}>
                  <button
                    type="button"
                    className={o.value === value ? 'is-on' : undefined}
                    aria-pressed={o.value === value}
                    onClick={() => choose(o.value)}
                  >
                    {o.label}
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
