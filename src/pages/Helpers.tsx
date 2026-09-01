import { useState, type FormEvent } from 'react'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useAnnounce, type Tone } from '../lib/announce'
import { useI18n } from '../lib/i18n-context'
import { date } from '../lib/format'
import { Empty, ErrorState, Field, Loading, Notice } from '../components/ui'
import type { GuardianLink } from '../lib/types'

/* Assisted use — the student's side of the guardian role (Table 3.1).
 *
 * The role has been in the system from the start and has never been holdable,
 * because nothing could create the link. What actually happened in its absence
 * is worth stating plainly: the help still occurred, by a parent knowing the
 * student's password. That defeats FR-10 entirely — every action reads as the
 * student's own — and it does so for exactly the users least able to notice or
 * object.
 *
 * Two decisions shape this page.
 *
 * It is written for the student, in the words they would use. "Guardian link"
 * is what we call it among ourselves; "people helping me" is what it is. The
 * page never says guardian, permission, or scope.
 *
 * And both sides live here. The person who helps a student very often has no
 * profile of their own — a parent with an account and nothing in it — so the
 * requests waiting for them appear on the same page, above their own list.
 * Giving them a separate screen they would have no reason to visit is how an
 * invitation goes unanswered.
 */
export default function Helpers() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const announce = useAnnounce()

  const mine = useQuery<GuardianLink[]>(
    signal => profile
      ? api.get('/me/guardians', undefined, signal)
      : Promise.resolve({ data: [] as GuardianLink[] }),
    [profile?.profile_id ?? ''],
  )

  const theirs = useQuery<GuardianLink[]>(
    signal => api.get('/me/guardianships', undefined, signal), [],
  )

  const invitations = (theirs.data ?? []).filter(l => l.status === 'INVITED')
  const helping = (theirs.data ?? []).filter(l => l.status === 'ACTIVE')

  async function act(
    path: string, method: 'POST' | 'DELETE', message: string, tone: Tone = 'ok',
  ) {
    try {
      if (method === 'DELETE') await api.del(path)
      else await api.post(path)
      announce(message, tone)
      mine.reload()
      theirs.reload()
    } catch (err) {
      announce(err instanceof Error ? err.message : t('common.error'), 'danger')
    }
  }

  return (
    <div className="page">
      <h1>{t('helpers.title')}</h1>
      <p className="lede">{t('helpers.lede')}</p>

      {/* Requests waiting on this person, first — somebody who signed in
          because a student asked them to should not have to find this. */}
      {invitations.length > 0 && (
        <section>
          <h2>{t('helpers.theirs')}</h2>
          {invitations.map(l => (
            <Notice key={l.link_id} tone="warn" title={`${l.student_name} ${t('helpers.askedBy')}`}>
              <p>{l.relationship}</p>
              <div className="row">
                <button
                  className="primary"
                  onClick={() => act(`/me/guardianships/${l.link_id}/accept`, 'POST',
                    t('helpers.accepted'))}
                >
                  {t('helpers.accept')}
                </button>
                <button
                  onClick={() => act(`/me/guardians/${l.link_id}`, 'DELETE',
                    t('helpers.removed'), 'warn')}
                >
                  {t('helpers.decline')}
                </button>
              </div>
            </Notice>
          ))}
        </section>
      )}

      {helping.length > 0 && (
        <section>
          <h2>{t('helpers.theirs')}</h2>
          <ul role="list" className="plain">
            {helping.map(l => (
              <li key={l.link_id} className="card">
                <strong>{l.student_name}</strong>
                <div className="muted">{l.relationship}</div>
                <button
                  className="quiet destructive"
                  onClick={() => act(`/me/guardians/${l.link_id}`, 'DELETE',
                    t('helpers.removed'), 'warn')}
                >
                  {t('helpers.remove')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The student's own list. Absent for somebody who only helps others. */}
      {profile && (
        <section>
          <h2>{t('helpers.mine')}</h2>

          {mine.loading && !mine.data && <Loading />}
          {mine.error ? <ErrorState error={mine.error} onRetry={mine.reload} /> : null}

          {mine.data && mine.data.length === 0 && (
            <Empty title={t('helpers.none')} hint={t('helpers.noneHint')} />
          )}

          {!!mine.data?.length && (
            <ul role="list" className="plain">
              {mine.data.map(l => (
                <li key={l.link_id} className="card">
                  <strong>{l.guardian_contact}</strong>
                  <div className="muted">{l.relationship}</div>
                  <div className="muted">
                    {l.status === 'INVITED' && t('helpers.statusInvited')}
                    {l.status === 'ACTIVE' && t('helpers.statusActive')}
                    {l.status === 'ENDED' && t('helpers.statusEnded')}
                    {' · '}
                    {l.can_submit ? t('helpers.canSubmitYes') : t('helpers.canSubmitNo')}
                    {' · '}{date(l.invited_at)}
                  </div>
                  {l.status !== 'ENDED' && (
                    <button
                      className="quiet destructive"
                      onClick={() => act(`/me/guardians/${l.link_id}`, 'DELETE',
                        t('helpers.removed'), 'warn')}
                    >
                      {t('helpers.remove')}
                      <span className="sr-only"> {l.guardian_contact}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <InviteForm onDone={() => mine.reload()} />
        </section>
      )}
    </div>
  )
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const announce = useAnnounce()

  const [contact, setContact] = useState('')
  const [relationship, setRelationship] = useState('')
  const [canSubmit, setCanSubmit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await api.post('/me/guardians', {
        contact, relationship, can_submit: canSubmit,
      })
      setContact('')
      setRelationship('')
      setCanSubmit(false)
      announce(t('helpers.sent'), 'ok')
      onDone()
    } catch (err) {
      // The API's message is written for the student — "nobody is registered
      // with that address" — so it is shown as it comes rather than replaced
      // with a generic failure.
      const fields = (err as { fields?: Record<string, string> })?.fields
      setError(fields?.contact ?? (err instanceof Error ? err.message : t('common.error')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card">
      <h3>{t('helpers.invite')}</h3>

      {error && <Notice tone="danger">{error}</Notice>}

      <Field label={t('helpers.contact')} hint={t('helpers.contactHint')} required>
        {props => (
          <input
            {...props}
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={contact}
            onChange={e => setContact(e.target.value)}
          />
        )}
      </Field>

      <Field label={t('helpers.relationship')} hint={t('helpers.relationshipHint')} required>
        {props => (
          <input
            {...props}
            type="text"
            value={relationship}
            onChange={e => setRelationship(e.target.value)}
          />
        )}
      </Field>

      {/* Off by default. Letting somebody else send an application is a larger
          step than letting them help fill one in, and the safer of the two is
          what a student gets without having to think about it. */}
      <Field label={t('helpers.canSubmit')} hint={t('helpers.canSubmitHint')}>
        {props => (
          <input
            {...props}
            type="checkbox"
            checked={canSubmit}
            onChange={e => setCanSubmit(e.target.checked)}
          />
        )}
      </Field>

      <button type="submit" className="primary" disabled={busy || !contact || !relationship}>
        {busy ? '…' : t('helpers.send')}
      </button>
    </form>
  )
}
