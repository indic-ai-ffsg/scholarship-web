/* My profile — what a student sees after they have finished registering.
 *
 * This screen exists because "My profile" used to open the wizard, and the
 * wizard opens on "Question 1 of 9". That is the right shape exactly once, for
 * somebody who has just registered and has nine answers to give. It is the
 * wrong shape forever afterwards: a student who moved house and wants to change
 * their state should not be walked through their disability certificate, their
 * income and their marks to get there, and a screen that says "Question 1 of 9"
 * to a person whose profile has been complete for six months is telling them
 * they have not started.
 *
 * So the wizard keeps the nine questions and moves to /profile/setup, and this
 * is what /profile means now: everything they have told us, in one list, with
 * one answer editable at a time.
 *
 * One at a time rather than one big form with a Save at the bottom, and that is
 * the same argument the wizard makes for its own shape. Nine controls live at
 * once is the form this product exists not to be; it also makes every save a
 * nine-field PATCH, so a stale tab quietly overwrites what was changed on a
 * phone an hour ago. Editing one row sends one field.
 */

import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useI18n } from '../lib/i18n-context'
import { useAnnounce } from '../lib/announce'
import {
  buildQuestions, displayValue, problemFor, type Answers, type Question,
} from '../lib/questions'
import { QuestionInput } from '../components/QuestionInput'
import { ErrorState } from '../components/ui'

export default function Profile() {
  const { profile } = useAuth()

  /* Nothing to review yet. The wizard is the whole of the answer for somebody
     with no profile, so they are sent there rather than shown nine empty rows
     and asked to edit each one. */
  if (!profile) return <Navigate to="/profile/setup" replace />

  return <ProfileDetails />
}

function ProfileDetails() {
  const { t } = useI18n()
  const { profile, refreshProfile } = useAuth()
  const questions = buildQuestions()
  const [editing, setEditing] = useState<string | null>(null)

  if (!profile) return null

  const answers: Answers = {}
  for (const q of questions) {
    const v = (profile as unknown as Record<string, unknown>)[q.field]
    if (v !== null && v !== undefined && v !== '') answers[q.field] = String(v)
  }

  const complete = profile.completeness_score >= 100

  return (
    <div className="page">
      <h1>{t('nav.profile')}</h1>
      <p className="lede">{t('profile.viewLede')}</p>

      {/* Where the wizard still belongs: a profile with answers missing. The
          meter is the same component the dashboard and the wizard use. */}
      {!complete && (
        <section className="card progress-panel" aria-labelledby="completeness">
          <h2 id="completeness">{t('dash.profileTitle')}</h2>
          <div className="progress">
            <div className="label">
              <span>{t('profile.complete', { n: profile.completeness_score })}</span>
              <span>{t('dash.toGo', { n: 100 - profile.completeness_score })}</span>
            </div>
            <div
              className="bar"
              role="progressbar"
              aria-valuenow={profile.completeness_score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('profile.complete', { n: profile.completeness_score })}
            >
              <span style={{ width: `${profile.completeness_score}%` }} />
            </div>
          </div>
          <div className="actions">
            <Link className="btn primary" to="/profile/setup">{t('profile.continue')}</Link>
          </div>
        </section>
      )}

      <dl className="detail-list">
        {questions.map(q => (
          <Row
            key={q.field}
            question={q}
            answers={answers}
            verified={profile.verified_fields?.includes(q.field) ?? false}
            editing={editing === q.field}
            onEdit={() => setEditing(q.field)}
            onDone={async (saved: boolean) => {
              setEditing(null)
              if (saved) await refreshProfile()
            }}
          />
        ))}
      </dl>
    </div>
  )
}

function Row({ question, answers, verified, editing, onEdit, onDone }: {
  question: Question
  answers: Answers
  verified: boolean
  editing: boolean
  onEdit: () => void
  onDone: (saved: boolean) => void
}) {
  const { t } = useI18n()
  const announce = useAnnounce()

  const [draft, setDraft] = useState<Answers>(answers)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shown = displayValue(question, answers[question.field])
  const problem = problemFor(question, draft)
  const value = draft[question.field] ?? ''

  async function save() {
    if (problem || value === '') return
    setBusy(true)
    setError(null)
    try {
      /* One field, not nine. The marks question still sends one — the scale and
         the number it was typed on live only in the draft; academic_percentage
         is the profile field, and the control has already converted to it. */
      await api.request('/me/profile', {
        method: 'PATCH',
        body: {
          [question.field]:
            question.kind === 'number' || question.kind === 'marks' ? Number(value) : value,
        },
      })
      announce(t('profile.saved'))
      onDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <div className="detail-row">
        <dt>
          {question.question}
          {verified && (
            <span className="verified">
              <span aria-hidden="true">✓</span> {t('profile.verified')}
            </span>
          )}
        </dt>
        <dd>
          {shown ?? <span className="muted">{t('profile.notAnswered')}</span>}
          <button type="button" className="quiet small" onClick={onEdit}>
            {shown ? t('profile.change') : t('profile.add')}
            <span className="sr-only"> — {question.question}</span>
          </button>
        </dd>
      </div>
    )
  }

  return (
    <div className="detail-row editing">
      {/* The control carries the question as its own label once editing starts,
          and the help text with it. Repeating both in the dt showed the student
          the same sentence twice in a row — so the term stays for the list's
          semantics and stops being drawn. */}
      <dt className="sr-only">{question.question}</dt>
      <dd>
        {error && <ErrorState error={error} onRetry={save} />}

        <QuestionInput
          question={question}
          answers={draft}
          onChange={patch => setDraft(d => ({ ...d, ...patch }))}
          label={question.question}
          autoFocus
        />

        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={save}
            disabled={busy || value === '' || Boolean(problem)}
          >
            {busy ? t('profile.saving') : t('profile.save')}
          </button>
          <button type="button" className="quiet" onClick={() => onDone(false)} disabled={busy}>
            {t('profile.cancelEdit')}
          </button>
        </div>
      </dd>
    </div>
  )
}
