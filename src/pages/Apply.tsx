import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useAnnounce } from '../lib/announce'
import { useI18n } from '../lib/i18n-context'
import { Empty, ErrorState, Loading, Notice, StateBadge } from '../components/ui'
import type { Application, EligibilityState, Reason, RequiredDocument } from '../lib/types'

/* Applying — UC-04.
 *
 * The flow the report describes: the system pre-fills from the profile,
 * attaches valid verified documents from the vault, the student reviews and
 * submits. The student's actual work here is one checkbox, because everything
 * else was done once, earlier, and is being reused.
 *
 * The alternate flow matters as much as the main one. If a required document is
 * absent or its verification has expired, the submission is blocked and the
 * specific document named — so this page shows the document checklist before
 * the button rather than failing after it.
 */

interface Eligibility {
  eligibility: {
    state: EligibilityState
    missing?: Reason[]
    failures?: Reason[]
    unverified?: Reason[]
  }
  next_action?: string
  documents: RequiredDocument[]
  documents_complete: boolean
  can_apply: boolean
}

export default function Apply() {
  const { scholarshipId } = useParams()
  const { t } = useI18n()
  const { profile } = useAuth()
  const announce = useAnnounce()
  const navigate = useNavigate()

  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  const query = useQuery<Eligibility>(
    signal => api.get(`/me/scholarships/${scholarshipId}/eligibility`, undefined, signal),
    [scholarshipId],
  )

  /* No profile, no eligibility to check.
   *
   * Reachable now that the public site invites somebody to apply before they
   * have an account: they register, and an account created a minute ago holds
   * nothing. The API answers that request with a refusal, which would arrive
   * here as a red error box for having done exactly what the site asked. This
   * says what is missing instead, and the scholarship comes back with them —
   * see lib/next.ts. */
  if (!profile) {
    return (
      <div className="page">
        <Empty
          title={t('apply.needProfile')}
          hint={t('apply.needProfileHint')}
          action={
            <Link className="btn primary" to={`/profile?next=/apply/${scholarshipId}`}>
              {t('profile.start')}
            </Link>
          }
        />
      </div>
    )
  }

  if (query.loading) return <div className="page"><Loading /></div>
  if (query.error) return <div className="page"><ErrorState error={query.error} onRetry={query.reload} /></div>
  if (!query.data) return null

  const { eligibility, documents, can_apply: canApply } = query.data
  const shared = [...new Set(documents.map(d => d.label))].join(', ')

  async function submit() {
    setBusy(true)
    setError(null)
    setBlocked(null)

    try {
      const res = await api.post<{
        application?: Application
        blocked: boolean
        blocked_reason?: string
      }>('/me/applications', {
        scholarship_id: scholarshipId,
        consent_given: true,
        // A retry over a flaky connection must not produce a second
        // application; the server recognises the key and returns the first.
        idempotency_key: `apply-${scholarshipId}`,
      })

      if (res.data.blocked) {
        setBlocked(res.data.blocked_reason ?? t('apply.blocked'))
        announce(res.data.blocked_reason ?? t('apply.blocked'), 'warn')
        query.reload()
        return
      }

      announce(t('apply.submit'), 'ok')
      navigate(`/applications/${res.data.application!.application_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <h1>{t('apply.title')}</h1>

      <div className="row" style={{ marginBottom: '1rem' }}>
        <StateBadge state={eligibility.state} />
      </div>

      {blocked && <Notice tone="warn" title={t('apply.blocked')}><p>{blocked}</p></Notice>}
      {error && <Notice tone="danger">{error}</Notice>}

      {!canApply && !blocked && (
        <Notice tone="warn" title={t('apply.blocked')}>
          <p>{query.data.next_action}</p>
        </Notice>
      )}

      {/* Every document, with its state. A student who cannot submit should be
          able to see at a glance which line is the problem. */}
      <section className="card" aria-labelledby="docs">
        <h2 id="docs" style={{ fontSize: 'var(--step-1)' }}>{t('apply.docs')}</h2>

        <ul role="list" className="stack tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {documents.map(doc => (
            <li key={doc.doc_type} className="row" style={{ alignItems: 'flex-start', gap: '0.625rem' }}>
              <span
                aria-hidden="true"
                style={{
                  color: doc.satisfied ? 'var(--eligible)' : 'var(--blocked)',
                  fontWeight: 700, fontSize: '1.1em',
                }}
              >
                {doc.satisfied ? '✓' : '!'}
              </span>
              <span>
                <strong>{doc.label}</strong>
                <span className="sr-only">
                  {' — '}{doc.satisfied ? t('doc.verified') : t('match.blocked')}
                </span>
                {doc.reason && (
                  <span className="muted" style={{ display: 'block', fontSize: 'var(--step--1)' }}>
                    {doc.reason}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {!query.data.documents_complete && (
          <p style={{ marginTop: '1rem', marginBottom: 0 }}>
            <Link className="btn" to="/documents">{t('nav.documents')}</Link>
          </p>
        )}
      </section>

      {/* Consent, recorded per application with a stated purpose and an
          enumerated field list. The DPDP Act requires the record; naming the
          fields is what makes it meaningful to the person giving it. */}
      <section className="card">
        <label className="choice" style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
          />
          <span>
            <span className="label">{t('apply.consent')}</span>
            <span className="sub">{t('apply.consentBody', { fields: shared })}</span>
          </span>
        </label>

        <button
          className="primary wide"
          style={{ marginTop: '1rem' }}
          onClick={submit}
          disabled={busy || !consent || !canApply}
        >
          {busy ? t('apply.submitting') : t('apply.submit')}
        </button>
      </section>
    </div>
  )
}
