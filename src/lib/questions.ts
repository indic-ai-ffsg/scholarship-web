/* The nine questions a student profile is made of.
 *
 * Extracted from the wizard because there are now two screens asking them: the
 * wizard, which walks a new student through all nine one at a time, and the
 * profile view, where somebody who finished months ago changes the one answer
 * that has since changed. Two copies of this list would drift, and the way it
 * would show is a value editable on one screen and not the other — or worse,
 * two different sets of options for the same field.
 *
 * The vocabularies come from lib/fields, shared with the public eligibility
 * check: that page asks a visitor the same questions before they have an
 * account and hands the answers here as a draft, so the lists have to offer the
 * same values or the answers would arrive and be dropped.
 */

import { categoryChoices, courseChoices, disabilityChoices, stateChoices } from './fields'
import type { Option } from '../components/ui'
import { date as formatDate, money } from './format'


export type Answers = Record<string, string>

export interface Question {
  /** The profile field this answers. */
  field: string
  question: string
  help?: string
  kind: 'text' | 'number' | 'date' | 'choice' | 'marks'
  options?: Option[]
  placeholder?: string
  /* The range the API will accept, for the number questions.
   *
   * It mattered less when a question could be skipped: a student who typed 400
   * could move on, and the value was dropped server-side. Now that every
   * question gates the one after it, a number the API will reject has to be
   * caught on the screen it was typed on — otherwise the wizard says nothing
   * until the last question, and rejects the whole profile with an error from
   * a validator the student cannot see. */
  min?: number
  max?: number
  outOfRange?: string
  /* Whole numbers only, because the API field is an int rather than a float.
   *
   * disability_percent is *int in profile.UpsertInput. A student who types 40.5
   * sends 40.5, and Go fails to decode the body before any handler or validator
   * runs — so the reply is the generic "We could not read that request", naming
   * no field, at the end of a nine-question form. Rounding it quietly would be
   * worse: that is their certificate's number, and it is not ours to adjust. */
  integer?: boolean
  /* How the stored value reads back on the profile view. The wizard never needs
     this — it shows the box the number was typed into — but a review screen
     showing a bare 250000 where an income belongs is asking the reader to do
     the formatting in their head. */
  unit?: 'percent' | 'money'
  inputMode?: 'text' | 'numeric' | 'tel'
}

/* Marks, three ways.
 *
 * An Indian marksheet states a result as a percentage, as a CGPA on the
 * ten-point scale, or as a CGPA on the five-point scale, and which one a
 * student holds is not a preference — it is what their institution printed.
 * Asking only for a percentage left a student holding 8.4 to do the conversion
 * themselves, and the ones who got it wrong were then filtered against a
 * number they had never checked.
 *
 * The profile still stores one number, and it has to: academic_percentage is
 * numeric(5,2) CHECK BETWEEN 0 AND 100 in 0003_student_profile.sql, and the
 * matching engine compares each scheme's minimum against that column. So the
 * scale is asked here, converted here, and the converted percentage is shown
 * back before the student moves on — a conversion nobody sees is a number
 * nobody can dispute.
 *
 * x9.5 for the ten-point scale is the CBSE formula, printed on the board's own
 * marksheets and quoted by most institutions that issue a CGPA. x20 for the
 * five-point scale is the scale itself. Both are named in the help text rather
 * than applied quietly.
 */
export type ScaleId = 'PERCENT' | 'CGPA10' | 'CGPA5'

export interface Scale {
  value: ScaleId
  /** The row in the chooser. */
  label: string
  sub: string
  /** The number field's own label, once this scale is the chosen one. */
  field: string
  hint: string
  max: number
  factor: number
  /** Said when the number is above what the scale can hold. */
  over: string
}

export const SCALES: Scale[] = [
  {
    value: 'PERCENT',
    label: 'A percentage',
    sub: 'Out of 100, as on most marksheets',
    field: 'Percentage',
    hint: 'A number between 0 and 100.',
    max: 100,
    factor: 1,
    over: 'A percentage cannot be more than 100.',
  },
  {
    value: 'CGPA10',
    label: 'A CGPA out of 10',
    sub: 'The ten-point scale',
    field: 'CGPA (out of 10)',
    hint: 'A number between 0 and 10. We convert it the way the CBSE does, by multiplying by 9.5.',
    max: 10,
    factor: 9.5,
    over: 'A CGPA on the ten-point scale cannot be more than 10.',
  },
  {
    value: 'CGPA5',
    label: 'A CGPA out of 5',
    sub: 'The five-point scale',
    field: 'CGPA (out of 5)',
    hint: 'A number between 0 and 5. We convert it by multiplying by 20.',
    max: 5,
    factor: 20,
    over: 'A CGPA on the five-point scale cannot be more than 5.',
  },
]

export function scaleOf(id: string): Scale {
  return SCALES.find(s => s.value === id) ?? SCALES[0]
}

/* Two decimals, because that is what the column holds. Rounding here rather
 * than letting Postgres do it means the number the student was shown is the
 * number that was stored. */
export function toPercent(score: number, scale: Scale): number {
  return Math.round(score * scale.factor * 100) / 100
}

/* Answers that are not profile fields.
 *
 * The API is sent the converted percentage and nothing else, so these two live
 * only in the draft — persist() builds its payload from `questions`, which
 * these are not in, so they cannot reach it. Keeping them means a student who
 * closes the tab and comes back finds the scale they chose and the number they
 * typed, rather than a percentage they never entered.
 */
export const SCALE_KEY = 'academic_scale'
export const SCORE_KEY = 'academic_score'

/* Nobody was born tomorrow, and a date picker will happily offer it. Read once
 * per load rather than per render: the value only has to be right to the day. */
export const today = new Date().toISOString().slice(0, 10)

/* The questions, in the order they are asked.
 *
 * The vocabularies they offer are in lib/fields, shared with the public
 * eligibility check: that page asks a visitor the same questions before they
 * have an account and hands the answers here as a draft, so the two lists have
 * to offer the same values or the answers would arrive and be dropped. */
export function buildQuestions(): Question[] {
  return [
    {
      field: 'full_name',
      kind: 'text',
      question: 'What is your name?',
      help: 'Exactly as it appears on your disability certificate. Providers check the two match.',
    },
    {
      field: 'disability_type',
      kind: 'choice',
      question: 'What is your disability?',
      help: 'As written on your certificate. Most scholarships filter on this.',
      options: disabilityChoices(),
    },
    {
      field: 'disability_percent',
      kind: 'number',
      inputMode: 'numeric',
      question: 'What percentage is on your certificate?',
      help: 'A number between 0 and 100. Many scholarships need 40% or more.',
      placeholder: '40',
      min: 0,
      max: 100,
      integer: true,
      unit: 'percent',
      outOfRange: 'A certificate percentage is between 0 and 100.',
    },
    {
      field: 'date_of_birth',
      kind: 'date',
      question: 'When were you born?',
      help: 'Some scholarships have an age limit.',
    },
    {
      field: 'course_level',
      kind: 'choice',
      question: 'What are you studying?',
      options: courseChoices(),
    },
    {
      field: 'state_code',
      kind: 'choice',
      question: 'Which state do you live in?',
      help: 'Many scholarships are open only to residents of certain states.',
      options: stateChoices(),
    },
    {
      field: 'annual_family_income',
      kind: 'number',
      inputMode: 'numeric',
      question: "What is your family's yearly income?",
      help: 'In rupees, as on your income certificate. Most scholarships have a ceiling.',
      placeholder: '250000',
      min: 0,
      unit: 'money',
      outOfRange: 'An income cannot be less than zero.',
    },
    {
      field: 'social_category',
      kind: 'choice',
      question: 'What is your category?',
      /* "Leave this if you are not sure" was the old help, and it stopped being
         true when the question stopped being skippable. General is the answer
         for a student with no certificate for another category, which is what
         the sentence was really telling them. */
      help: 'As on your caste or EWS certificate. Choose General if you do not have one.',
      options: categoryChoices(),
    },
    {
      field: 'academic_percentage',
      kind: 'marks',
      unit: 'percent',
      question: 'What were your last exam marks?',
      help: 'Choose the way your marksheet states them, then type the number. Many scholarships ask for a minimum.',
    },
  ]
}


/* The stored answer, as a person reads it back.
 *
 * The profile view shows values rather than inputs, and a raw one is rarely the
 * answer somebody gave: a choice is stored as its enum (UNDERGRADUATE), a date
 * as an ISO string, an income as 250000. Returns null for "not answered yet",
 * which the caller renders as its own thing rather than as an empty line.
 */
export function displayValue(q: Question, raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null

  if (q.kind === 'choice') {
    return q.options?.find(o => o.value === raw)?.label ?? raw
  }
  if (q.kind === 'date') {
    return formatDate(raw)
  }
  if (q.unit === 'money') return money(Number(raw))
  if (q.unit === 'percent') return `${raw}%`
  return raw
}

/* The complaint a number earns, or null. Shared so the wizard and the profile
 * view reject the same values with the same words — and so neither can send the
 * API something it will refuse to decode. */
export function numberProblem(q: Question, value: string): string | null {
  if (value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return 'Enter a number.'
  if (q.integer && !Number.isInteger(n)) {
    return 'Enter a whole number, without a decimal point.'
  }
  const under = q.min !== undefined && n < q.min
  const over = q.max !== undefined && n > q.max
  return under || over ? q.outOfRange ?? 'That number is out of range.' : null
}

export function marksProblem(scale: Scale, raw: string): string | null {
  if (raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return 'Enter a number.'
  if (n < 0) return 'Marks cannot be less than zero.'
  return n > scale.max ? scale.over : null
}

/* The complaint an answer earns, or null.
 *
 * Lives here rather than beside the control so that a caller can gate its own
 * Save button on exactly the rule the control is displaying — and so the file
 * holding the control exports a component and nothing else, which is what keeps
 * hot reload working.
 */
export function problemFor(question: Question, answers: Answers): string | null {
  if (question.kind === 'marks') {
    const scale = scaleOf(answers[SCALE_KEY] ?? 'PERCENT')
    return marksProblem(scale, answers[SCORE_KEY] ?? answers.academic_percentage ?? '')
  }
  if (question.kind === 'number') {
    return numberProblem(question, answers[question.field] ?? '')
  }
  return null
}

/* The profile's own value, in the form the control and the API both want.
 *
 * The API's round trip is not symmetric, and this is where that bites. It
 * returns date_of_birth as *time.Time — "2000-01-03T00:00:00Z" — and accepts it
 * back as a string validated `datetime=2006-01-02`, which that is not. The
 * wizard seeds its answers from the profile and re-sends every one of them on
 * each Next, so a student who already had a date of birth got
 * "Some of the details you entered need attention." on every step of a form
 * they could not fix, because the offending value was one the server had just
 * given them.
 *
 * It also fixes the display: <input type="date"> shows nothing at all unless
 * the value is exactly yyyy-mm-dd, so the box appeared empty over a date the
 * student had definitely entered.
 */
export function seedValue(q: Question, raw: unknown): string {
  const s = String(raw)
  if (q.kind === 'date') {
    // Tolerant of both: a bare date passes through, a timestamp loses its time.
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(s)
    return m ? m[1] : s
  }
  return s
}

/* Where a next step is actually done.
 *
 * Every step used to lead to the wizard, because every step was a wizard
 * question. One is not: "documents" is answered by uploading a certificate and
 * waiting for an organisation to check it, and sending a student to Question 1
 * of 9 for that reopened nine answers they had already given, changed nothing,
 * and left the meter where it was.
 */
export function stepDestination(field: string): string {
  return field === 'documents' ? '/documents' : '/profile/setup'
}
