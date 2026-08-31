import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { clearDraft, readDraft, saveDraft } from '../lib/draft'
import { categoryChoices, courseChoices, disabilityChoices, stateChoices } from '../lib/fields'
import { safeNext } from '../lib/next'
import { useI18n } from '../lib/i18n-context'
import { useAnnounce } from '../lib/announce'
import { ChoiceGroup, Field, Notice, Progress, type Option } from '../components/ui'

/* The profile wizard.
 *
 * Table 4.1: "linear and guided; a single question per screen; drafts tolerant
 * of connection loss." All three are load-bearing rather than stylistic.
 *
 * One question per screen, because the alternative — a long form asking for a
 * disability percentage, a family income and a UDID number at once — is what
 * makes people abandon. Each answer is written to the device before it is sent,
 * so a failed request costs nothing.
 *
 * Every question is required. Questions after the name used to be skippable, on
 * the argument that an incomplete profile still matches some schemes and that
 * being blocked at question three by a certificate that is at home is how
 * somebody never comes back. That is now handled by the draft rather than by
 * the skip: every answer is on the device the moment it is typed, and the
 * wizard reopens at the first unanswered question, so leaving to fetch a
 * document costs the student their place in the queue and nothing else. What
 * skipping cost was worse and less visible — a profile missing an income or a
 * percentage is silently ineligible for the schemes that filter on them, and
 * the student is never told which answer was the one that lost them a match.
 */

type Answers = Record<string, string>

interface Question {
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
type ScaleId = 'PERCENT' | 'CGPA10' | 'CGPA5'

interface Scale {
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

const SCALES: Scale[] = [
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

function scaleOf(id: string): Scale {
  return SCALES.find(s => s.value === id) ?? SCALES[0]
}

/* Two decimals, because that is what the column holds. Rounding here rather
 * than letting Postgres do it means the number the student was shown is the
 * number that was stored. */
function toPercent(score: number, scale: Scale): number {
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
const SCALE_KEY = 'academic_scale'
const SCORE_KEY = 'academic_score'

/* Nobody was born tomorrow, and a date picker will happily offer it. Read once
 * per load rather than per render: the value only has to be right to the day. */
const today = new Date().toISOString().slice(0, 10)

/* The questions, in the order they are asked.
 *
 * The vocabularies they offer are in lib/fields, shared with the public
 * eligibility check: that page asks a visitor the same questions before they
 * have an account and hands the answers here as a draft, so the two lists have
 * to offer the same values or the answers would arrive and be dropped. */
function buildQuestions(): Question[] {
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
      question: 'What were your last exam marks?',
      help: 'Choose the way your marksheet states them, then type the number. Many scholarships ask for a minimum.',
    },
  ]
}

export default function ProfileWizard() {
  const { t } = useI18n()
  const { profile, context, refreshProfile, justRegistered } = useAuth()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const location = useLocation()

  /* Where finishing leads.
   *
   * The matched list, normally. But a visitor who pressed Apply on the public
   * eligibility check was sent through registration and then here, because an
   * application needs a profile — and the scholarship they had chosen travels in
   * the address so that finishing hands them back to it, rather than to a list
   * they now have to search for it in. */
  const destination = safeNext(location.search)

  const questions = useMemo(() => buildQuestions(), [])
  const ownerId = context?.profile_id ?? 'new'

  /* Seeded once, at mount, from two sources.
   *
   * Lazy initialisers rather than an effect: the auth provider loads the
   * profile before it reports `authenticated`, so by the time this component
   * mounts the profile is already in hand. Seeding in an effect would schedule
   * a second render before the first had painted, which is what React's lint
   * rules flag.
   *
   * Anything unsent on this device wins over the server's copy, because a draft
   * is by definition newer than what the server has.
   */
  const seeded = useMemo(() => {
    const out: Answers = {}
    if (!profile) return out

    for (const q of questions) {
      const v = (profile as unknown as Record<string, unknown>)[q.field]
      if (v !== null && v !== undefined && v !== '') out[q.field] = String(v)
    }
    return out
  }, [profile, questions])

  const [answers, setAnswers] = useState<Answers>(() => {
    const draft = readDraft<Answers>('profile', ownerId)
    return draft ? { ...seeded, ...draft.value } : seeded
  })

  const [restored] = useState<string | null>(
    () => readDraft<Answers>('profile', ownerId)?.savedAt ?? null,
  )

  // Resume at the first unanswered question rather than at the start. Computed
  // once: recomputing as the student types would move them off the question
  // they are answering.
  const [step, setStep] = useState(() => {
    const draft = readDraft<Answers>('profile', ownerId)
    const initial = draft ? { ...seeded, ...draft.value } : seeded
    const gap = questions.findIndex(q => !initial[q.field])
    return gap === -1 ? 0 : gap
  })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  /* Moving to the next question has to move the reader with it.
   *
   * This used to rely on a key on the heading, on the belief that remounting
   * an element moves a screen reader's virtual cursor to it. It does not.
   * Nothing moved: focus stayed on the button that had just been pressed, and
   * somebody using a screen reader heard the button's own label again while a
   * completely different question appeared above it — the single worst place
   * in this whole product for that to happen, since the wizard is the one
   * screen every student must get through.
   *
   * Focus goes to the heading rather than to the input. Focusing the input
   * skips the question and the help text, which is the part that says "as
   * written on your certificate" — and on a phone it opens the keyboard and
   * scrolls the question off the top of the screen before it has been read. */
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  /* One writer, because the marks question answers three keys at once — the
     scale, the number typed, and the percentage derived from the pair — and
     three separate writes would save three drafts and could interleave. */
  const setMany = useCallback((patch: Answers) => {
    setAnswers(prev => {
      const next = { ...prev, ...patch }
      // Written before it is sent. A failed request then costs nothing.
      saveDraft('profile', ownerId, next)
      return next
    })
  }, [ownerId])

  const setAnswer = useCallback(
    (field: string, value: string) => setMany({ [field]: value }),
    [setMany],
  )

  const question = questions[step]
  const isLast = step === questions.length - 1
  const value = answers[question?.field] ?? ''

  /* The marks question's three parts, derived rather than held in state.
   *
   * A profile that already has a percentage — typed on another device, or
   * carried in from the public eligibility check — arrives with neither of the
   * draft-only keys, and reading through to academic_percentage is what makes
   * that case open on the percentage the student gave rather than on an empty
   * box. */
  const scale = scaleOf(answers[SCALE_KEY] ?? 'PERCENT')
  const score = answers[SCORE_KEY] ?? answers.academic_percentage ?? ''
  const scoreNumber = Number(score)
  const marksError =
    score === '' ? null
    : !Number.isFinite(scoreNumber) ? 'Enter a number.'
    : scoreNumber < 0 ? 'Marks cannot be less than zero.'
    : scoreNumber > scale.max ? scale.over
    : null

  /* The same job for the plain number questions, from the range each one
     declares. */
  const numberError = (() => {
    if (question?.kind !== 'number' || value === '') return null
    const n = Number(value)
    if (!Number.isFinite(n)) return 'Enter a number.'
    const under = question.min !== undefined && n < question.min
    const over = question.max !== undefined && n > question.max
    return under || over ? question.outOfRange ?? 'That number is out of range.' : null
  })()

  /* The scale and the number are one answer, so a change to either recomputes
     the percentage. Somebody who picks the wrong scale first and corrects it
     does not have to retype the number. Out of range clears the percentage,
     which is also what stops Next: there is nothing valid to send. */
  function setMarks(nextScale: ScaleId, raw: string) {
    const s = scaleOf(nextScale)
    const n = Number(raw)
    const ok = raw !== '' && Number.isFinite(n) && n >= 0 && n <= s.max
    setMany({
      [SCALE_KEY]: nextScale,
      [SCORE_KEY]: raw,
      academic_percentage: ok ? String(toPercent(n, s)) : '',
    })
  }

  async function persist(final: boolean) {
    setBusy(true)
    setError(null)

    // Only what has actually been answered. Sending empty strings would
    // overwrite a value the student supplied on another device with nothing.
    const payload: Record<string, unknown> = {}
    for (const q of questions) {
      const v = answers[q.field]
      if (v === undefined || v === '') continue
      payload[q.field] = q.kind === 'number' ? Number(v) : v
    }

    try {
      if (profile) {
        await api.request('/me/profile', { method: 'PATCH', body: payload })
      } else {
        await api.post('/me/profile', payload)
      }
      await refreshProfile()

      if (final) {
        clearDraft('profile', ownerId)
        setDone(true)
        announce(t('profile.done.title'))
      }
      return true
    } catch (err) {
      // The draft is still on the device, so the answers are not lost — say so
      // rather than implying the work is gone.
      setError(err instanceof Error ? err.message : t('common.error'))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (isLast) {
      if (await persist(true)) return
      return
    }
    // Saved on every step, not only at the end: a student who closes the tab at
    // question six should find six answers waiting, not none.
    void persist(false)
    setStep(s => s + 1)
  }

  if (done) {
    return (
      <div className="page narrow">
        <Notice tone="good" title={t('profile.done.title')}>
          <p>{t('profile.done.body')}</p>
          {/* Three destinations, three labels. The dashboard is where saving
              normally leads — this is "Save Registration" in the flow diagram,
              and the dashboard is what it opens. The matched list is where the
              older default went and is still reachable by a carried `next`.
              Anything else is a specific page the student was already headed
              for, and "Continue" is the honest word for returning them to it. */}
          <button className="primary" onClick={() => navigate(destination)}>
            {destination === '/dashboard' ? t('profile.done.dashboard')
              : destination === '/matches' ? t('profile.done.cta')
              : t('auth.continue')}
          </button>
        </Notice>
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="page">
      <div className="wizard">
        <Progress step={step + 1} total={questions.length} />

        {/* The welcome belongs here rather than on the dashboard, because this
            is where a newly registered student actually lands: verifying a code
            makes an account, and the guard sends an account with no details
            straight back here. By the time they reach the dashboard the wizard
            has refreshed the session and justRegistered is already false. */}
        {justRegistered && step === 0 && !profile && (
          <Notice tone="info">{t('auth.welcome')}</Notice>
        )}
        {restored && step === 0 && (
          <Notice tone="info">{t('profile.savedLocally')}</Notice>
        )}
        {error && <Notice tone="danger" title={t('common.error')}>{error}</Notice>}

        {/* tabIndex -1 so the effect above can move focus here on every step.
            The heading is the target rather than the input: it carries the
            question, and the help text under it follows in reading order. */}
        <h1 className="wizard-question" ref={headingRef} tabIndex={-1}>
          {question.question}
        </h1>
        {question.help && <p className="wizard-help">{question.help}</p>}

        {question.kind === 'choice' ? (
          <ChoiceGroup
            legend={question.question}
            name={question.field}
            options={question.options ?? []}
            value={value}
            onChange={v => setAnswer(question.field, v)}
          />
        ) : question.kind === 'marks' ? (
          /* Two controls, one answer. The scale is asked first because it
             decides what the number means, and it is asked with the same large
             rows as every other choice on this screen rather than as a select
             tucked beside the box — on a phone, a chooser that changes what the
             next control accepts should not be the smaller of the two. */
          <>
            <ChoiceGroup
              legend="How your marks are stated"
              name={SCALE_KEY}
              options={SCALES.map(sc => ({ value: sc.value, label: sc.label, sub: sc.sub }))}
              value={scale.value}
              onChange={v => setMarks(v as ScaleId, score)}
            />

            <div style={{ marginTop: '1.25rem' }}>
              <Field
                label={scale.field}
                hint={scale.hint}
                error={marksError ?? undefined}
                required
              >
                {props => (
                  <input
                    {...props}
                    type="number"
                    inputMode="decimal"
                    /* Marksheets carry two decimals — 87.6, 8.45 — so the
                       control has to accept them or it rejects the number the
                       student is copying. */
                    step="0.01"
                    min={0}
                    max={scale.max}
                    placeholder={scale.value === 'PERCENT' ? '75' : scale.value === 'CGPA10' ? '8.4' : '4.2'}
                    value={score}
                    onChange={e => setMarks(scale.value, e.target.value)}
                  />
                )}
              </Field>

              {/* The number that will actually be stored and compared. Shown
                  only where it differs from what was typed, and deliberately
                  not a live region: it changes on every keystroke, and a
                  screen reader announcing a running total over the digits
                  being entered is worse than silence. The rule is in the
                  field's hint instead, which is read with the field. */}
              {scale.value !== 'PERCENT' && !marksError && score !== '' && (
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
        ) : (
          <Field label={question.question} error={numberError ?? undefined} required>
            {props => (
              <input
                {...props}
                type={question.kind === 'date' ? 'date' : question.kind === 'number' ? 'number' : 'text'}
                inputMode={question.inputMode}
                placeholder={question.placeholder}
                min={question.min}
                max={question.kind === 'date' ? today : question.max}
                value={value}
                onChange={e => setAnswer(question.field, e.target.value)}
              />
            )}
          </Field>
        )}

        <div className="wizard-nav">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} disabled={busy}>
              {t('profile.back')}
            </button>
          )}
          {/* Every question is required, so every question gates this button.
              The marks question gates it twice over: an out-of-range number
              clears the percentage, so there is nothing to advance with. */}
          <button
            className="primary"
            onClick={next}
            disabled={busy || !value || Boolean(numberError)}
          >
            {busy ? t('profile.saved') : isLast ? t('profile.finish') : t('profile.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
