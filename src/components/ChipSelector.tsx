/* Chips that are really checkboxes and radios.
 *
 * The registration form asks nine questions on one screen, and four of them
 * have between two and twenty-one answers. Twenty-one large rows — the
 * ChoiceGroup control the wizard used — is a screenful per question and roughly
 * four thousand pixels of form; a <select> holding twenty-one options hides
 * every one of them behind a press and makes "select all that apply"
 * unexpressible. Chips are the only control that shows the whole vocabulary at
 * a glance and still fits beside eight other questions.
 *
 * ---------------------------------------------------------------------------
 * Why these are inputs and not <span role="checkbox">
 * ---------------------------------------------------------------------------
 *
 * The client's wireframe draws them as spans carrying role="checkbox" /
 * role="radio" and a hand-written Enter/Space handler. That is the usual way to
 * build a chip and it loses four things this audience actually uses:
 *
 *   - Arrow keys. A real radio group is one tab stop and the arrows move within
 *     it. Twenty-one span-radios are twenty-one tab stops, so reaching the last
 *     disability by keyboard is twenty-one presses instead of one plus arrows.
 *   - "3 of 21". A native group announces the position and size; a div of spans
 *     announces neither unless every one is given aria-posinset by hand.
 *   - Space. role="checkbox" on a span does not scroll-lock Space, so the
 *     hand-written handler has to preventDefault or the page jumps a screen
 *     every time somebody ticks a chip.
 *   - Forms. A required radio group participates in validation; a span cannot.
 *
 * So the input stays, positioned over the chip and made invisible without being
 * removed from the accessibility tree, and the chip is its <label>. `:checked`
 * and `:focus-visible` on the input draw the selected and focused states in
 * CSS, which is also what keeps them working when JavaScript is still loading.
 *
 * The target is 48px tall, which is the floor for this product and the reason
 * these do not look like the smaller .chip used to display a tag elsewhere.
 * Selection is never carried by colour alone: a selected chip also gains a tick
 * and a two-pixel border.
 */

import type { Choice } from '../lib/fields'

interface ChipSelectorProps {
  /** Labels the group. Required — an unlabelled group of chips is a puzzle. */
  legend: string
  /** Shared by every input in a single-select group; ignored by multi. */
  name: string
  options: Choice[]
  selected: string[]
  /** Multi-select renders checkboxes, single-select renders radios. */
  multi?: boolean
  /** Shown but not selectable, with the reason carried by the caller's copy. */
  disabledValues?: string[]
  onChange: (selected: string[]) => void
}

export function ChipSelector({
  legend, name, options, selected, multi = false, disabledValues = [], onChange,
}: ChipSelectorProps) {
  function toggle(value: string) {
    if (multi) {
      onChange(
        selected.includes(value)
          ? selected.filter(v => v !== value)
          : [...selected, value],
      )
      return
    }
    /* Single-select chips are deselectable, unlike a native radio group, and
       that is deliberate: every one of these questions is required, so the only
       reason to clear one is having picked the wrong program — and the student
       who does that then has to change the year as well. The caller clears it
       for them (see ProgramChips), which it can only do if it hears the
       deselect. */
    onChange(selected.includes(value) ? [] : [value])
  }

  return (
    <fieldset className="chip-fieldset">
      <legend className="sr-only">{legend}</legend>
      <div className="chip-choices">
        {options.map(opt => {
          const off = disabledValues.includes(opt.value)
          return (
            <label
              key={opt.value}
              className={`chip-choice${off ? ' off' : ''}`}
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={multi ? `${name}-${opt.value}` : name}
                value={opt.value}
                checked={selected.includes(opt.value)}
                disabled={off}
                /* onClick as well as onChange, and only for the radios. A radio
                   that is already checked fires no change event, so a second
                   press on the selected chip would do nothing and the deselect
                   above would be unreachable. Checkboxes fire change both ways
                   and would double-toggle if this ran for them too. */
                onClick={multi ? undefined : () => toggle(opt.value)}
                onChange={() => { if (multi) toggle(opt.value) }}
              />
              {/* aria-hidden: the tick is the visual half of a state the input
                  already announces, and "tick Blindness checked" is the same
                  fact twice. */}
              <span className="tick" aria-hidden="true" />
              <span className="chip-label">{opt.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
