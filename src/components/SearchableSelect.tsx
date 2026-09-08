/* A combobox over a long list, for the one question that has thirty-six answers.
 *
 * Thirty-six states as chips is a wall; as a <select> it is a scroll a student
 * on a phone has to flick through with the list covering the form. Typing three
 * letters is the fastest route to "Maharashtra" and it is the only one of the
 * three controls this form uses that gets shorter as the list gets longer.
 *
 * ARIA 1.2 combobox + listbox, hand-built rather than native. <input list> with
 * a <datalist> would be a tenth of this file and was the first attempt: it
 * cannot be styled to a 48px row, Safari renders it as a plain text box with no
 * affordance that a list exists, and — the reason it was abandoned — it offers
 * no way to keep a display label and a stored value apart, which this question
 * requires. The API validates `state_code`, so the student picks
 * "Maharashtra" and the profile stores "MH".
 *
 * What the pattern owes the reader, and what each part below is for:
 *   - the box says it is a combobox, whether it is expanded, and which option is
 *     active (aria-activedescendant, so focus never leaves the input and typing
 *     keeps working while arrowing);
 *   - arrows move, Enter commits, Escape reverts, Tab leaves without committing
 *     a half-typed name;
 *   - leaving the widget reverts uncommitted text, because a box reading "Mah"
 *     over a stored value of nothing is the state this control must never be
 *     left in silently;
 *   - the count of matches is announced, since filtering is otherwise a purely
 *     visual event.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'

import type { Choice } from '../lib/fields'

interface SearchableSelectProps {
  /** From the Field wrapper, so the label points at the real control. */
  id: string
  options: Choice[]
  /** The stored value — a code, not a label. */
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export function SearchableSelect({
  id, options, value, onChange, placeholder, required,
  'aria-describedby': describedBy, 'aria-invalid': invalid,
}: SearchableSelectProps) {
  const labelFor = (v: string) => options.find(o => o.value === v)?.label ?? ''

  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => labelFor(value))
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrap = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  /* The box follows the value when it changes from outside — a profile arriving
   * after the first paint, or the form being reset.
   *
   * Adjusted during render against the last value seen, rather than in an
   * effect. An effect would paint the stale label first and correct it on the
   * next frame, which for this control means the student sees the previous
   * state's name flash in the box; React also re-renders immediately on a
   * setState during render, without committing the throwaway pass, so this is
   * the cheaper of the two as well. It is the documented way to reset state
   * when a prop changes short of remounting on a key, and a key here would
   * take the open/closed state and the caret with it. */
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(labelFor(value))
  }

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase()
    /* The whole list when the box is empty or still shows the committed label,
       which is the state it is in the moment it is opened: a student who picked
       Kerala and reopens the list wants to see the list, not one row reading
       Kerala. Filtering starts when they actually type something else. */
    if (!q || q === labelFor(value).toLowerCase()) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [text, value, options]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(choice: Choice) {
    onChange(choice.value)
    setText(choice.label)
    setOpen(false)
    setActiveIndex(-1)
    input.current?.focus()
  }

  function close(revert: boolean) {
    setOpen(false)
    setActiveIndex(-1)
    if (revert) setText(labelFor(value))
  }

  /* Pointer down anywhere outside closes and reverts. pointerdown rather than
     click, so pressing a button elsewhere on the form does not first have to
     survive this handler stealing its focus. */
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close(true)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, value]) // eslint-disable-line react-hooks/exhaustive-deps

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(0)
        return
      }
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(i => {
        const next = i + delta
        // Wraps, because a list this long is faster to reach the end of
        // backwards.
        if (next < 0) return matches.length - 1
        if (next >= matches.length) return 0
        return next
      })
      return
    }

    if (e.key === 'Enter') {
      if (!open) return
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < matches.length) {
        commit(matches[activeIndex])
        return
      }
      /* Nothing arrowed to, but a name typed in full still commits — somebody
         who types "Kerala" and presses Enter has answered the question, and
         making them press Down first to select the only row on screen is the
         kind of thing that reads as the form ignoring them. */
      const exact = options.find(o => o.label.toLowerCase() === text.trim().toLowerCase())
      if (exact) { commit(exact); return }

      /* And the same for a prefix that has narrowed to one row, which is the
       * ordinary way this field gets used: type "Ker", see Kerala and nothing
       * else, press Enter. Only the full spelling committed before, so a unique
       * prefix fell through to close(true) — which reverts the text to whatever
       * was selected before, i.e. empties the field. The student is left having
       * answered the question, watched it clear, and been given no reason why.
       *
       * Exactly one, never "the first of several": with two rows on screen a
       * commit here would be a guess, and reverting is the honest answer. */
      if (matches.length === 1) { commit(matches[0]); return }

      close(true)
      return
    }

    if (e.key === 'Escape' && open) {
      // Stopped here so it does not also close a dialog this form may sit in.
      e.stopPropagation()
      close(true)
      return
    }

    if (e.key === 'Tab') close(true)
  }

  return (
    <div className="combo" ref={wrap}>
      <input
        ref={input}
        id={id}
        type="text"
        role="combobox"
        // Off, or the browser's own suggestion list covers the listbox.
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        required={required}
        placeholder={placeholder}
        value={text}
        onChange={e => {
          setText(e.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
      />
      <span className="combo-arrow" aria-hidden="true">▾</span>

      <ul id={listboxId} role="listbox" className="combo-list" hidden={!open}>
        {matches.length === 0 && (
          <li className="combo-empty" role="presentation">No state matches that.</li>
        )}
        {matches.map((o, i) => (
          <li
            key={o.value}
            id={`${listboxId}-${i}`}
            role="option"
            aria-selected={o.value === value}
            className={`combo-option${i === activeIndex ? ' active' : ''}${o.value === value ? ' selected' : ''}`}
            /* preventDefault keeps focus on the input, so the listbox does not
               close from a blur before the selection is recorded. */
            onPointerDown={e => { e.preventDefault(); commit(o) }}
          >
            {o.label}
          </li>
        ))}
      </ul>

      {/* Filtering is otherwise silent. Only while open, so it does not
          announce a count over a control nobody is using. */}
      <span className="sr-only" role="status">
        {open ? `${matches.length} ${matches.length === 1 ? 'state' : 'states'} available` : ''}
      </span>
    </div>
  )
}
