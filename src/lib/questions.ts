/* The questions a student profile is made of.
 *
 * Extracted from the wizard that used to hold them, and kept after it went,
 * because two screens still read this list: the registration form writes these
 * fields, and the profile view reads them back. displayValue below is the whole
 * reason it is worth one file — a choice stored as UNDERGRADUATE and a date
 * stored as an ISO string both need turning back into the answer somebody gave,
 * and doing that beside each caller is how the two drift.
 *
 * The vocabularies come from lib/fields, which the registration form also
 * reads — so a value shown here and a value written there cannot drift.
 */

import { disabilityChoices, genderChoices, stateChoices } from './fields'
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
  /* Answerable with nothing, and the wizard lets the student walk past it.
   *
   * The default is the opposite, and the argument for it outlived the wizard
   * that made it: an unanswered question is a scheme silently lost, and the
   * student is never told which one it was. It does not hold for a question a
   * student may have no answer to. Nobody can invent a UDID number they have not been issued, and a
   * student between school and college has no institution to name — and a
   * required question they cannot answer is not a prompt, it is a wall across
   * question four of eleven.
   *
   * Both of these are safe to leave: neither is scored by compute_completeness
   * (0031, 0036), so skipping one still reaches 100%, and no scheme filters on
   * either — they identify a student and corroborate what they claimed, which
   * is work that happens after a match, not before one. */
  optional?: boolean
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
   * no field, at the end of the whole form. Rounding it quietly would be
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
 * The vocabularies they offer are in lib/fields, which the registration form
 * writes from, so the two cannot offer different values for one field. */
/** The same lookup lib/fields takes. */
type T = (key: string) => string

/* Takes `t` because the profile view draws these, and the review screen is the
 * one place a student reads their own answers back. The marks scale above is
 * deliberately left in English: SCALES is reachable only from marksProblem and
 * problemFor, and no screen renders either since the wizard went — translating
 * fifteen strings nobody can see would be fifteen strings to keep in step for
 * nothing. If a marks control comes back, that is the moment. */
export function buildQuestions(t: T): Question[] {
  return [
    {
      field: 'full_name',
      kind: 'text',
      question: t('q.full_name'),
      help: t('q.full_name.help'),
    },
    {
      /* Optional, and it is the one question here where that word carries a
         meaning beyond convenience: UNDISCLOSED is an answer, so a student who
         declines is not left with a permanent gap the dashboard keeps
         nagging about. */
      field: 'gender',
      kind: 'choice',
      optional: true,
      question: t('q.gender'),
      help: t('q.gender.help'),
      options: genderChoices(t),
    },
    {
      field: 'disability_type',
      kind: 'choice',
      question: t('q.disability_type'),
      help: t('q.disability_type.help'),
      options: disabilityChoices(t),
    },
    {
      field: 'disability_percent',
      kind: 'number',
      inputMode: 'numeric',
      question: t('q.disability_percent'),
      help: t('q.disability_percent.help'),
      placeholder: '40',
      min: 0,
      max: 100,
      integer: true,
      unit: 'percent',
      outOfRange: t('q.disability_percent.range'),
    },
    {
      /* Asked here because it comes off the same document as the two answers
         above it, and a student reading their card has it in their hand. */
      field: 'udid_number',
      kind: 'text',
      optional: true,
      question: t('q.udid_number'),
      help: t('q.udid_number.help'),
    },
    {
      field: 'date_of_birth',
      kind: 'date',
      question: t('q.date_of_birth'),
      help: t('q.date_of_birth.help'),
    },
    /* "What are you studying?" was here, offering the four course_level values.
     *
     * It is gone because the registration form asks the same question better
     * and more precisely: the program chips name an actual course — BE / BTech,
     * MBA, Diploma / ITI — and courseLevelFor maps whichever is chosen down to
     * the enum. Keeping both meant the profile view listed "Undergraduate" on
     * one row and "BE / BTech" on another, which is one answer shown twice, the
     * coarser of the two first.
     *
     * course_level is still stored, still matched on, and still read back — it
     * arrives through course_name and the program chips now, and the year row
     * below reads it to know whether an ordinal means Class 10 or 3rd year. */
    {
      /* The program, as the student picked it. Read-only here: the chips that
         write it live on the registration form, and a second copy of a
         forty-option grouped chooser on the review screen is the duplication
         that removing "What are you studying?" above was about. */
      field: 'course_name',
      kind: 'text',
      optional: true,
      question: t('q.course_name'),
      help: t('q.course_name.help'),
    },
    {
      /* Free text rather than a chooser, and that is not laziness. The
         `institution` table an id would point at is curated by nobody — no
         importer, no search endpoint, no screen that lists one — so a picker
         here would be a picker over an empty list. See migration 0036. */
      field: 'institution_name',
      kind: 'text',
      optional: true,
      question: t('q.institution_name'),
      help: t('q.institution_name.help'),
      placeholder: t('q.institution_name.placeholder'),
    },
    {
      field: 'state_code',
      kind: 'choice',
      question: t('q.state_code'),
      help: t('q.state_code.help'),
      options: stateChoices(t),
    },
    {
      field: 'annual_family_income',
      kind: 'number',
      inputMode: 'numeric',
      question: t('q.annual_family_income'),
      help: t('q.annual_family_income.help'),
      placeholder: '250000',
      min: 0,
      unit: 'money',
      outOfRange: t('q.annual_family_income.range'),
    },
    {
      field: 'academic_percentage',
      kind: 'marks',
      unit: 'percent',
      question: t('q.academic_percentage'),
      help: t('q.academic_percentage.help'),
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
 * waiting for an organisation to check it, and sending a student to the first
 * question for that reopened every answer they had already given, changed
 * nothing, and left the meter where it was.
 *
 * The wizard is gone and the questions live on the registration form, re-opened
 * with ?edit so it arrives holding the answers already given rather than empty.
 * The documents exception outlives it unchanged.
 */
export function stepDestination(field: string): string {
  return field === 'documents' ? '/documents' : '/register?edit'
}
