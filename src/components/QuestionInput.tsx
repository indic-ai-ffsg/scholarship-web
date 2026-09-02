/* The control for one profile question, wherever it is being asked.
 *
 * Two screens ask these now — the wizard, one question per screen for somebody
 * who has just registered, and the profile view, where somebody who finished
 * months ago changes the single answer that has since changed. The controls
 * have to be the same controls: the marks question in particular is a scale
 * chooser, a number box and a derived percentage working together, and a second
 * hand-rolled copy of it on the view screen is how one of them ends up
 * converting a CGPA differently from the other.
 *
 * The component owns no state. Both callers already hold the answers — the
 * wizard in a draft it writes to the device, the view in a single field being
 * edited — so this takes the values and hands back changes.
 */

import { ChoiceGroup, Field } from './ui'
import {
  SCALES, SCALE_KEY, SCORE_KEY, marksProblem, numberProblem, scaleOf, toPercent, today,
  type Answers, type Question, type ScaleId,
} from '../lib/questions'

export interface QuestionInputProps {
  question: Question
  /** Every answer, because the marks question reads three of them. */
  answers: Answers
  /** Writes one or more answers at once; the marks question writes three. */
  onChange: (patch: Answers) => void
  /** Labels the control when the question is not already a heading above it. */
  label?: string
  autoFocus?: boolean
}

export function QuestionInput({
  question, answers, onChange, label, autoFocus,
}: QuestionInputProps) {
  const value = answers[question.field] ?? ''

  if (question.kind === 'choice') {
    return (
      <ChoiceGroup
        legend={question.question}
        name={question.field}
        options={question.options ?? []}
        value={value}
        onChange={v => onChange({ [question.field]: v })}
      />
    )
  }

  if (question.kind === 'marks') {
    /* The scale is asked first because it decides what the number means, and it
       is asked with the same large rows as every other choice rather than as a
       select tucked beside the box — on a phone, a chooser that changes what the
       next control accepts should not be the smaller of the two. */
    const scale = scaleOf(answers[SCALE_KEY] ?? 'PERCENT')
    const score = answers[SCORE_KEY] ?? answers.academic_percentage ?? ''
    const scoreNumber = Number(score)
    const error = marksProblem(scale, score)

    /* The scale and the number are one answer, so a change to either recomputes
       the percentage. Somebody who picks the wrong scale first and corrects it
       does not have to retype the number. Out of range clears the percentage,
       which is what stops the caller saving: there is nothing valid to send. */
    const setMarks = (nextScale: ScaleId, raw: string) => {
      const s = scaleOf(nextScale)
      const n = Number(raw)
      const ok = raw !== '' && Number.isFinite(n) && n >= 0 && n <= s.max
      onChange({
        [SCALE_KEY]: nextScale,
        [SCORE_KEY]: raw,
        academic_percentage: ok ? String(toPercent(n, s)) : '',
      })
    }

    return (
      <>
        <ChoiceGroup
          legend="How your marks are stated"
          name={SCALE_KEY}
          options={SCALES.map(sc => ({ value: sc.value, label: sc.label, sub: sc.sub }))}
          value={scale.value}
          onChange={v => setMarks(v as ScaleId, score)}
        />

        <div style={{ marginTop: '1.25rem' }}>
          <Field label={scale.field} hint={scale.hint} error={error ?? undefined} required>
            {props => (
              <input
                {...props}
                type="number"
                inputMode="decimal"
                /* Marksheets carry two decimals — 87.6, 8.45 — so the control
                   has to accept them or it rejects the number being copied. */
                step="0.01"
                min={0}
                max={scale.max}
                autoFocus={autoFocus}
                placeholder={
                  scale.value === 'PERCENT' ? '75' : scale.value === 'CGPA10' ? '8.4' : '4.2'
                }
                value={score}
                onChange={e => setMarks(scale.value, e.target.value)}
              />
            )}
          </Field>

          {/* The number that will actually be stored and compared. Shown only
              where it differs from what was typed, and deliberately not a live
              region: it changes on every keystroke, and a screen reader
              announcing a running total over the digits being entered is worse
              than silence. The rule is in the field's hint instead, which is
              read with the field. */}
          {scale.value !== 'PERCENT' && !error && score !== '' && (
            <p className="wizard-derived">
              <span className="mark" aria-hidden="true">=</span>
              <span>
                {toPercent(scoreNumber, scale)}% — the figure scholarships are
                compared against, and what we save.
              </span>
            </p>
          )}
        </div>
      </>
    )
  }

  return (
    <Field
      label={label ?? question.question}
      hint={label ? question.help : undefined}
      error={numberProblem(question, value) ?? undefined}
      /* Field draws "(optional)" beside the label when this is false, which is
         the only place the profile view can say so: it has no Skip button to
         put the word on, and a row somebody may leave blank forever should not
         look like one they have failed to fill in. */
      required={!question.optional}
    >
      {props => (
        <input
          {...props}
          type={question.kind === 'date' ? 'date' : question.kind === 'number' ? 'number' : 'text'}
          inputMode={question.inputMode}
          placeholder={question.placeholder}
          min={question.min}
          max={question.kind === 'date' ? today : question.max}
          // The spinner arrows then step in ones, and a phone keypad offers no
          // decimal point for a field that cannot take one.
          step={question.integer ? 1 : undefined}
          autoFocus={autoFocus}
          value={value}
          onChange={e => onChange({ [question.field]: e.target.value })}
        />
      )}
    </Field>
  )
}
