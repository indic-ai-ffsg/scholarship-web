/* My profile — everything a student has told us, read only.
 *
 * This screen used to hold a second copy of every control on the registration
 * form: each row could be opened in place, edited with the shared
 * QuestionInput, and saved on its own with a one-field PATCH. The argument for
 * that was good and is worth recording, because it is not obvious why it went.
 * One field at a time meant one field on the wire, so a stale tab could not
 * overwrite an answer changed on a phone an hour earlier, and it meant nobody
 * was ever shown eleven live controls at once.
 *
 * What it cost was two of everything. Two places asking for a disability
 * percentage, two places converting a CGPA, two places deciding whether a UDID
 * number is optional — and the drift that follows is the kind that shows up as
 * a value editable on one screen and not the other. The registration form is
 * now one screen that can be re-opened (/register?edit) with the answers
 * already in it, which is the same affordance without the second
 * implementation: a student who moved house opens it, changes the state, and
 * presses save.
 *
 * So this is a review. It lists what is stored, marks what the platform has
 * verified or asked to be corrected, and hands off to the form for anything that needs changing. The
 * one-field PATCH is the real loss and it is a real one — saving now sends the
 * whole form again. It is bounded by the fact that a student is the only writer
 * of their own profile, so the tab that loses a race is their own.
 */

import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../lib/auth-context'
import { useI18n } from '../lib/i18n-context'
import { buildQuestions, displayValue, isDocumentStep, seedValue, type Answers } from '../lib/questions'
import { IconForm, IconGraduate, IconShield } from '../components/icons'
import { Avatar } from '../components/Avatar'

/* The three groups the registration form asks these questions in, so the
   profile reads back in the order it was filled in, under the same headings.
   A field missing from all three still shows, under the first — a question
   added to lib/questions and not here must not vanish from the page. */
const GROUPS = [
  { key: 'personal', title: 'reg.personal', icon: <IconForm />,
    fields: ['full_name', 'gender', 'date_of_birth', 'state_code', 'annual_family_income'] },
  { key: 'disability', title: 'reg.disability', icon: <IconShield />,
    fields: ['disability_type', 'disability_percent', 'udid_number'] },
  { key: 'education', title: 'reg.education', icon: <IconGraduate />,
    fields: ['course_name', 'institution_name', 'academic_percentage'] },
] as const

export default function Profile() {
  const { t } = useI18n()
  const { profile } = useAuth()

  /* Nothing to review yet. The form is the whole of the answer for somebody
     with no profile, so they are sent there rather than shown a list of empty
     rows. */
  if (!profile) return <Navigate to="/register" replace />

  const questions = buildQuestions(t)

  const answers: Answers = {}
  for (const q of questions) {
    const v = (profile as unknown as Record<string, unknown>)[q.field]
    if (v !== null && v !== undefined && v !== '') answers[q.field] = seedValue(q, v)
  }

  const complete = profile.completeness_score >= 100

  /* Answers the platform refused and the student has not yet changed. Once
     they change one it drops out: the next look is the platform's to take. */
  const refused = new Map((profile.field_reviews ?? [])
    .filter(r => r.decision === 'REFUSED' && r.current)
    .map(r => [r.field, r.reason ?? '']))
  const refusedQuestions = questions.filter(q => refused.has(q.field))

  const grouped = new Set<string>(GROUPS.flatMap(g => g.fields as readonly string[]))
  const questionsIn = (fields: readonly string[], first: boolean) => questions.filter(q =>
    fields.includes(q.field) || (first && !grouped.has(q.field)))

  return (
    <div className="page profile">
      {/* The title band, and on it who this is: the name, how complete the
          profile is, and the one way to change it. The edit button was at the
          foot of eleven rows, below the fold of the screen somebody opens when
          they want to change something. It is one button still, not one per
          row — see the note it carried. */}
      <header className="page-hero profile-hero">
        <Avatar name={profile.full_name} className="profile-avatar" />
        <div className="profile-hero-text">
          <h1>{t('nav.profile')}</h1>
          <p className="profile-name">
            <strong>{profile.full_name}</strong>
            <span className="profile-complete">{t('profile.complete', { n: profile.completeness_score })}</span>
          </p>
          <p className="lede">{t('profile.viewLede')}</p>
        </div>
        {/* One button for the whole profile rather than eleven "Change"
            buttons: eleven controls all reading "Change" is close to useless
            in a screen reader's list of controls, and every one of them led to
            the same questions in the end. */}
        <Link className="btn primary profile-edit" to="/register?edit">{t('profile.edit')}</Link>
      </header>

      {/* What needs correcting, first. A refusal is the one thing on this
          page that is waiting on the student, so it comes before the meter,
          names each answer and says why, and has the one button that fixes
          it. role="alert" is not used: it is not new on every visit, and a
          page that interrupts on load is worse than one read in order. */}
      {refusedQuestions.length > 0 && (
        <section className="card refused-panel" aria-labelledby="refused">
          <h2 id="refused">
            <span className="refused-mark" aria-hidden="true">!</span>
            {t('profile.refusedTitle', { n: refusedQuestions.length })}
          </h2>
          <p className="lede">{t('profile.refusedLede')}</p>
          <ul className="refused-list">
            {refusedQuestions.map(q => (
              <li key={q.field}>
                <strong>{q.question}</strong>
                {refused.get(q.field) && <span>{refused.get(q.field)}</span>}
              </li>
            ))}
          </ul>
          <div className="actions">
            <Link className="btn primary" to="/register?edit">{t('profile.refusedFix')}</Link>
          </div>
        </section>
      )}

      {/* The meter, and the way back into the form. Both are here rather than
          only on the dashboard because this is the screen somebody opens when
          they want to change something. */}
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
          {profile.next_steps?.length ? (
            <p className="next">
              <span className="mark" aria-hidden="true">→</span>
              <span>{profile.next_steps[0].message}</span>
            </p>
          ) : null}

          <div className="actions">
            {/* The two documents are the next steps the form cannot answer:
                each is answered by uploading a file, and sending somebody to
                the form for that would reopen every answer and change
                nothing. */}
            {isDocumentStep(profile.next_steps?.[0]?.field ?? '') ? (
              <Link className="btn primary" to="/documents">{t('doc.upload')}</Link>
            ) : (
              <Link className="btn primary" to="/register?edit">{t('profile.continue')}</Link>
            )}
          </div>
        </section>
      )}

      {/* The answers in the three groups they were asked in, each its own
          card and its own <dl>, so a screen reader still hears question and
          answer paired, and can jump between the groups by heading. */}
      <div className="profile-groups">
        {GROUPS.map((g, i) => {
          const qs = questionsIn(g.fields, i === 0)
          if (qs.length === 0) return null
          return (
            <section key={g.key} className={`card profile-group profile-group-${g.key}`}
                     aria-labelledby={`profile-${g.key}`}>
              <h2 id={`profile-${g.key}`}>
                <span className="profile-group-icon" aria-hidden="true">{g.icon}</span>
                {t(g.title)}
              </h2>
              <dl className="profile-list">
                {qs.map(q => {
                  const shown = displayValue(q, answers[q.field])
                  const verified = profile.verified_fields?.includes(q.field) ?? false
                  const reason = refused.get(q.field)
                  return (
                    <div className={`profile-row${reason !== undefined ? ' is-refused' : ''}`} key={q.field}>
                      <dt>{q.question}</dt>
                      <dd>
                        {shown ?? <span className="muted">{t('profile.notAnswered')}</span>}
                        {/* Checked against a document, so the student knows
                            which answers a provider has already accepted. A
                            word and a tick, never the colour alone. */}
                        {verified && (
                          <span className="verified">
                            <span aria-hidden="true">✓</span> {t('profile.verified')}
                          </span>
                        )}
                        {reason !== undefined && (
                          <span className="refused">
                            <span aria-hidden="true">!</span> {t('profile.refused')}
                          </span>
                        )}
                        {reason && <span className="refused-reason">{reason}</span>}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          )
        })}
      </div>
    </div>
  )
}
