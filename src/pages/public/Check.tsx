import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { saveDraft } from '../../lib/draft'
import { canApply } from '../../lib/eligibility'
import { categoryChoices, courseChoices, disabilityChoices, stateChoices } from '../../lib/fields'
import { useI18n } from '../../lib/i18n-context'
import { withNext } from '../../lib/next'
import { Field, Notice, ResultCard, type FieldProps } from '../../components/ui'
import type { CheckResult, CheckedScheme } from '../../lib/types'

/* "Do I qualify?" — asked and answered before anything is created.
 *
 * This is the first step of the flow the rest of the public site now leads into:
 * check, then find, then apply, and only at the point of applying an account.
 * The order is the argument. The report's own reasoning for the four states of
 * Table 4.2 — that "no" and "not yet" are different answers and only one of them
 * is actionable — applies twice as hard to somebody who has not registered:
 * asking a student to fill in nine questions, upload a disability certificate
 * and wait for a verification before finding out that nothing is open to them is
 * how a platform loses the people it exists for.
 *
 * ---------------------------------------------------------------------------
 * One screen, not nine
 * ---------------------------------------------------------------------------
 *
 * The profile wizard asks one question per screen, for the reasons set out in
 * that file, and this deliberately does not. The wizard's audience has decided
 * to be here and its answers are being saved; this one's audience is deciding
 * whether to stay, and eight screens of questions before a single result is the
 * cost that decides them against it. So the questions that matter most are on
 * one short form, the two that matter least are behind a disclosure, and every
 * one of them can be left blank.
 *
 * The answers go nowhere near the address bar — contrast the directory, which
 * keeps its filters in the URL on purpose so they can be forwarded. A
 * disability percentage and a family income in a URL end up in browser history,
 * in a proxy log and in the Referer header of every link on the page.
 *
 * They are written to this device once, and only for somebody with no account,
 * so that registering does not mean answering the same six questions again — it
 * is the same draft the profile wizard reads (lib/draft.ts). Somebody already
 * signed in gets nothing written, because their wizard draft is real work in
 * progress and this form has no business overwriting it.
 */

/** The fields the API takes as numbers. */
const NUMERIC = new Set(['disability_percent', 'annual_family_income', 'academic_percentage'])

/* Every question here is optional, so none of them says so.
 *
 * Field marks an unrequired control "(optional)", which earns its place on a
 * form that mixes the two — the registration form, where the password is
 * required and the email is not. On this one it appeared eight times in a row,
 * which is eight repetitions of something the lede states once, and the reader
 * still has to check each label to find the required question there isn't. */
function CheckField(props: Omit<FieldProps, 'required' | 'optional'>) {
  return <Field {...props} optional={false} />
}

/* This form's own name for each field a rule can reference.
 *
 * Needed because the reasons the engine returns are written for somebody who
 * has an account: a blocked scheme comes back as "Add your state code to your
 * profile", and the reader of this page has no profile to add it to — and has
 * never seen the phrase "state code" either. The instruction they can act on is
 * the question in front of them, under the label it carries.
 *
 * A field with no entry here falls back to the engine's own sentence, which is
 * imperfect for a visitor but true, and better than silence. */
const FIELD_LABEL: Record<string, string> = {
  disability_type: 'check.disabilityType',
  disability_percent: 'check.disabilityPercent',
  course_level: 'check.courseLevel',
  state_code: 'check.state',
  annual_family_income: 'check.income',
  social_category: 'check.category',
  date_of_birth: 'check.dob',
  // Derived from the date of birth, so the question to answer is the same one.
  age: 'check.dob',
  academic_percentage: 'check.marks',
}

type Answers = Record<string, string>

export default function Check() {
  const { t } = useI18n()
  const { status } = useAuth()

  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<CheckResult | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resultsRef = useRef<HTMLHeadingElement>(null)
  const signedIn = status === 'authenticated'
  const answered = Object.values(answers).filter(v => v !== '').length

  function set(field: string, value: string) {
    setAnswers(prev => ({ ...prev, [field]: value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})

    try {
      const res = await api.post<CheckResult>('/public/eligibility-check', payload(answers))
      setResult(res.data)

      // Kept for the profile wizard, which reads the same draft under the
      // pre-account owner. Only for a visitor: see the note at the top.
      if (!signedIn) saveDraft('profile', 'new', answers)

      /* Focus moves to the results heading.
       *
       * Without it the page has silently grown a section below the fold: a
       * screen reader stays on the button that was pressed and hears nothing,
       * and somebody using magnification is still looking at the form. The
       * heading rather than the first card, so the count is read before the
       * list it counts. */
      requestAnimationFrame(() => resultsRef.current?.focus())
    } catch (err) {
      const fields = (err as { fields?: Record<string, string> }).fields
      if (fields) setFieldErrors(fields)
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1>{t('check.title')}</h1>
      <p className="lede">{t('check.lede')}</p>

      <form onSubmit={submit} noValidate>
        <div className="card">
          <div className="answers">
            <CheckField label={t('check.disabilityType')} error={fieldErrors.disability_type}>
              {props => (
                <Select
                  {...props}
                  value={answers.disability_type ?? ''}
                  onChange={v => set('disability_type', v)}
                  options={disabilityChoices()}
                  blank={t('check.unanswered')}
                />
              )}
            </CheckField>

            <CheckField
              label={t('check.disabilityPercent')}
              hint={t('check.disabilityPercentHint')}
              error={fieldErrors.disability_percent}
            >
              {props => (
                <input
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  placeholder="40"
                  value={answers.disability_percent ?? ''}
                  onChange={e => set('disability_percent', e.target.value)}
                />
              )}
            </CheckField>

            <CheckField label={t('check.courseLevel')} error={fieldErrors.course_level}>
              {props => (
                <Select
                  {...props}
                  value={answers.course_level ?? ''}
                  onChange={v => set('course_level', v)}
                  options={courseChoices()}
                  blank={t('check.unanswered')}
                />
              )}
            </CheckField>

            <CheckField label={t('check.state')} error={fieldErrors.state_code}>
              {props => (
                <Select
                  {...props}
                  value={answers.state_code ?? ''}
                  onChange={v => set('state_code', v)}
                  options={stateChoices()}
                  blank={t('check.unanswered')}
                />
              )}
            </CheckField>

            <CheckField
              label={t('check.income')}
              hint={t('check.incomeHint')}
              error={fieldErrors.annual_family_income}
            >
              {props => (
                <input
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="250000"
                  value={answers.annual_family_income ?? ''}
                  onChange={e => set('annual_family_income', e.target.value)}
                />
              )}
            </CheckField>

            <CheckField label={t('check.category')} error={fieldErrors.social_category}>
              {props => (
                <Select
                  {...props}
                  value={answers.social_category ?? ''}
                  onChange={v => set('social_category', v)}
                  options={categoryChoices()}
                  blank={t('check.unanswered')}
                />
              )}
            </CheckField>
          </div>

          {/* Two questions fewer schemes ask about, behind a disclosure rather
              than dropped: a scheme with an age limit or a marks floor is
              precisely the one a student is otherwise told they are blocked on
              for no visible reason. A <details> because it is keyboard-operable
              and announces its own state without any script. */}
          <details className="more-answers">
            <summary>{t('check.more')}</summary>
            <p className="muted">{t('check.moreHint')}</p>

            <div className="answers">
              <CheckField label={t('check.dob')} error={fieldErrors.date_of_birth}>
                {props => (
                  <input
                    {...props}
                    type="date"
                    value={answers.date_of_birth ?? ''}
                    onChange={e => set('date_of_birth', e.target.value)}
                  />
                )}
              </CheckField>

              <CheckField label={t('check.marks')} error={fieldErrors.academic_percentage}>
                {props => (
                  <input
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    placeholder="75"
                    value={answers.academic_percentage ?? ''}
                    onChange={e => set('academic_percentage', e.target.value)}
                  />
                )}
              </CheckField>
            </div>
          </details>

          <button type="submit" className="primary" disabled={busy || answered === 0}>
            {busy ? t('check.checking') : t('check.go')}
          </button>

          {/* Said before the button, not after it. Somebody deciding whether to
              type a family income into a public website needs to know what
              becomes of it while they are deciding. */}
          <p className="muted" style={{ margin: '1rem 0 0', fontSize: 'var(--step--1)' }}>
            {t('check.privacy')}
          </p>
        </div>
      </form>

      {error && <Notice tone="danger" title={t('common.error')}><p>{error}</p></Notice>}

      {result && <Results result={result} answers={answers} signedIn={signedIn} headingRef={resultsRef} />}
    </div>
  )
}

/* Only what was answered, and numbers as numbers.
 *
 * An empty string is dropped rather than sent: the API distinguishes a question
 * left blank from an answer of nought, and "" arriving as 0 would report a
 * student on a nil income as ineligible for the schemes that have a floor. */
function payload(answers: Answers) {
  const body: Record<string, string | number> = {}

  for (const [field, raw] of Object.entries(answers)) {
    if (raw === '') continue

    if (NUMERIC.has(field)) {
      const n = Number(raw)
      if (!Number.isFinite(n)) continue
      body[field] = n
    } else {
      body[field] = raw
    }
  }

  return body
}

function Results({
  result, answers, signedIn, headingRef,
}: {
  result: CheckResult
  answers: Answers
  signedIn: boolean
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const { t } = useI18n()

  const qualifying = (result.counts.ELIGIBLE ?? 0) + (result.counts.LIKELY_ELIGIBLE ?? 0)
  const blocked = result.counts.BLOCKED ?? 0
  const actionable = result.results.filter(r => r.state !== 'NOT_ELIGIBLE')
  const closed = result.results.filter(r => r.state === 'NOT_ELIGIBLE')

  /* The bridge to the second step of the flow: the same directory, narrowed to
   * what these answers imply. State and course level travel in the address
   * because the directory's filters live there by design; the disability type
   * and the income figure do not, for the reason given at the top of this file. */
  const browse = new URLSearchParams()
  if (answers.state_code) browse.set('state_code', answers.state_code)
  if (answers.course_level) browse.set('course_level', answers.course_level)
  const browseUrl = browse.toString() ? `/scholarships?${browse}` : '/scholarships'

  return (
    <section aria-labelledby="check-results" style={{ marginTop: '2.5rem' }}>
      {/* tabIndex -1 so the submit handler can move focus here. */}
      <h2 id="check-results" ref={headingRef} tabIndex={-1}>{t('check.results')}</h2>

      {/* Three sentences, not two, and the middle one is the whole point of the
          BLOCKED state. Somebody who answered two questions has every scheme
          waiting on a third, and telling them "none of these match" — which is
          what a bare qualifying count would have said — is both false and the
          single most discouraging thing this page could say. */}
      <p className="lede">
        {qualifying > 0
          ? t('check.summary', { n: qualifying, total: result.considered })
          : blocked > 0
            ? t('check.summaryBlocked', { n: blocked, total: result.considered })
            : t('check.summaryNone', { total: result.considered })}
      </p>
      <p className="muted">{t('check.answered', { n: result.answered })}</p>

      {actionable.length > 0 && (
        <ul role="list" className="stack" style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
          {actionable.map(r => (
            <li key={r.scholarship_id}>
              <ResultCard
                state={r.state}
                title={r.title}
                slug={r.slug}
                award={r.award_amount}
                organisation={r.organisation_name}
                daysRemaining={r.days_remaining}
                nextAction={instruction(r, answers, t)}
                /* The signed-in sentence for ELIGIBLE is "everything we checked
                   is verified", and here it would be a lie: nobody has shown us
                   a certificate, and the state means only that this scheme sets
                   no condition needing one. The other three read true for a
                   visitor as they stand. */
                help={r.state === 'ELIGIBLE' ? t('check.eligibleHelp') : undefined}
              >
                {/* Applying is the one step that genuinely needs an account —
                    a provider cannot receive an application from nobody — so
                    the button says so rather than springing a sign-up form on
                    somebody who pressed "Apply". The scholarship travels with
                    them and they come back to it. */}
                {canApply(r.state) && (
                  <Link
                    className="btn primary"
                    to={signedIn
                      ? `/apply/${r.scholarship_id}`
                      : withNext('/register', `/apply/${r.scholarship_id}`)}
                  >
                    {signedIn ? t('match.apply') : t('check.applyRegister')}
                  </Link>
                )}

                <Link className="btn quiet" to={`/scholarships/${r.slug}`}>{t('match.view')}</Link>
              </ResultCard>
            </li>
          ))}
        </ul>
      )}

      {/* Shown, not hidden. A visitor who cannot see the schemes that ruled them
          out is left wondering whether the check simply missed them — and the
          disclosed reason is often what tells them which certificate to get for
          next year. */}
      {closed.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          {/* The heading only. Each card carries the same sentence already, and
              printing it above the list as well says it twice in four lines. */}
          <h3>{t('match.ineligible')}</h3>
          <ul role="list" className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {closed.map(r => (
              <li key={r.scholarship_id}>
                <ResultCard
                  state={r.state}
                  title={r.title}
                  slug={r.slug}
                  award={r.award_amount}
                  organisation={r.organisation_name}
                  daysRemaining={r.days_remaining}
                  nextAction={r.next_action}
                >
                  <Link className="btn quiet" to={`/scholarships/${r.slug}`}>{t('match.view')}</Link>
                </ResultCard>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row" style={{ marginTop: '2rem' }}>
        <Link className="btn" to={browseUrl}>{t('check.browse')}</Link>
        {browseUrl !== '/scholarships' && (
          <Link className="btn quiet" to="/scholarships">{t('home.browseAll')}</Link>
        )}
      </div>

      {!signedIn && (
        <Notice tone="info" title={t('check.saveTitle')}>
          <p>{t('check.saveBody')}</p>
          <Link className="btn primary" to="/register">{t('auth.register')}</Link>
          <p style={{ marginTop: '1rem', marginBottom: 0 }}>
            {t('auth.haveAccount')} <Link to="/signin">{t('auth.signin')}</Link>
          </p>
        </Notice>
      )}
    </section>
  )
}

/* What to tell the reader to do about one scheme.
 *
 * For a blocked scheme the engine's reason is either "you have not supplied X"
 * or "the X you supplied does not meet this, and a certificate may show
 * otherwise". The two need different sentences here, and the visitor's own
 * answers are what tells them apart: a field they left blank is a question to
 * go back and answer, and a field they filled in is the provider's judgement on
 * what they said — which is the provider's sentence to deliver, not ours.
 *
 * Anything not blocked keeps the engine's own next action: "get your disability
 * certificate verified" is as true before registering as after. */
function instruction(
  r: CheckedScheme,
  answers: Answers,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (r.state !== 'BLOCKED') return r.next_action

  const unanswered = (r.missing ?? [])
    .filter(m => !answers[m.field] && FIELD_LABEL[m.field])
    .map(m => t(FIELD_LABEL[m.field]))

  // Deduplicated: two rules on the same field are two reasons and one question.
  const questions = [...new Set(unanswered)]

  return questions.length
    ? t('check.answerThese', { fields: questions.join(', ') })
    : r.next_action
}

/* A <select> rather than the wizard's radio rows.
 *
 * Twenty-one disability types and thirty-six states as tappable rows is a page
 * three screens long before the next question, which on this page — where the
 * whole point is a fast answer — costs more than the larger targets are worth.
 * The wizard, asking one question per screen with room for it, keeps the rows. */
function Select({
  value, onChange, options, blank, ...props
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; sub?: string }[]
  blank: string
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}) {
  return (
    <select {...props} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{blank}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.sub ? `${o.label} — ${o.sub}` : o.label}
        </option>
      ))}
    </select>
  )
}
