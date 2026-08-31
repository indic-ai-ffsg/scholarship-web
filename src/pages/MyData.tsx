import { useState } from 'react'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useAnnounce } from '../lib/announce'
import { useI18n } from '../lib/i18n-context'
import { date, humanise } from '../lib/format'
import { Empty, ErrorState, Loading, Notice } from '../components/ui'
import type { AccessEntry, Consent } from '../lib/types'

/* The student's own view of what the platform holds (FR-19 and FR-20).
 *
 * The access log is the unusual one. Most systems hold an audit trail for their
 * own protection; this one shows it to the person it concerns, because section
 * 4.3.2's bargain — hand over a disability certificate once and every provider
 * reuses it — is only fair if the student can see who actually opened it.
 *
 * Written for reading rather than for compliance. "Meridian Technologies CSR
 * opened your disability certificate" is the sentence; the entry behind it has
 * a role, an address and a request id, and none of that helps here.
 */
export default function MyData() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const announce = useAnnounce()

  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [retained, setRetained] = useState<string[] | null>(null)

  const access = useQuery<AccessEntry[]>(
    signal => api.get('/me/access-log', { page_size: 50 }, signal), [],
  )
  const consents = useQuery<Consent[]>(
    signal => api.get('/me/consents', undefined, signal), [],
  )

  if (!profile) {
    return <div className="page"><Empty title={t('match.none')} hint={t('match.noneHint')} /></div>
  }

  async function requestExport() {
    setBusy('export')
    try {
      await api.post('/me/data-requests/export')
      setMessage(t('privacy.requested'))
      announce(t('privacy.requested'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(null)
    }
  }

  async function requestErasure() {
    setBusy('erase')
    try {
      const res = await api.post<{ retained: string[] }>('/me/data-requests/erasure')
      setRetained(res.data.retained)
      announce(t('privacy.requested'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(null)
    }
  }

  async function withdraw(consentId: string) {
    setBusy(consentId)
    try {
      await api.del(`/me/consents/${consentId}`, { reason: 'Withdrawn by the student' })
      consents.reload()
      announce(t('privacy.withdraw'), 'warn')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(null)
    }
  }

  const entries = access.data ?? []
  const grants = consents.data ?? []

  return (
    <div className="page">
      <h1>{t('privacy.title')}</h1>
      <p className="lede">{t('privacy.lede')}</p>

      {message && <Notice tone="info">{message}</Notice>}

      <section className="card" aria-labelledby="access">
        <h2 id="access" style={{ fontSize: 'var(--step-1)' }}>{t('privacy.access')}</h2>

        {access.loading && !access.data && <Loading />}
        {access.error ? <ErrorState error={access.error} onRetry={access.reload} /> : null}

        {access.data && entries.length === 0 && (
          <p className="muted" style={{ marginBottom: 0 }}>{t('privacy.accessNone')}</p>
        )}

        {entries.length > 0 && (
          <ul role="list" className="stack tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {entries.map((e, i) => (
              <li key={i} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <strong>{e.organisation_name ?? t('app.name')}</strong>
                {' — '}
                {e.action_label.toLowerCase()}
                {e.document_name ? `: ${e.document_name}` : ''}
                <span className="muted" style={{ display: 'block', fontSize: 'var(--step--1)' }}>
                  {date(e.accessed_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="consents">
        <h2 id="consents" style={{ fontSize: 'var(--step-1)' }}>{t('privacy.consents')}</h2>

        {consents.loading && !consents.data && <Loading />}
        {grants.length === 0 && !consents.loading && (
          <p className="muted" style={{ marginBottom: 0 }}>—</p>
        )}

        {grants.map(c => (
          <div key={c.consent_id} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <strong>{c.organisation_name}</strong>
            {c.scholarship_title && <span className="muted"> · {c.scholarship_title}</span>}

            <p className="muted" style={{ margin: '0.25rem 0', fontSize: 'var(--step--1)' }}>
              {/* The exact field list, because "we share your details" is not
                  consent to anything in particular. */}
              {c.fields_shared.map(humanise).join(', ')}
            </p>

            {c.active ? (
              <button className="quiet" disabled={busy === c.consent_id} onClick={() => withdraw(c.consent_id)}>
                {t('privacy.withdraw')}
                <span className="sr-only"> — {c.organisation_name}</span>
              </button>
            ) : (
              <span className="muted">{t('privacy.withdraw')} ✓</span>
            )}
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="rights">
        <h2 id="rights" style={{ fontSize: 'var(--step-1)' }}>{t('privacy.export')}</h2>
        <p>{t('privacy.exportBody')}</p>
        <button onClick={requestExport} disabled={busy === 'export'}>
          {t('privacy.export')}
        </button>

        <hr style={{ margin: '1.5rem 0', border: 0, borderTop: '1px solid var(--border)' }} />

        <h3 id="rights" style={{ fontSize: 'var(--step-1)' }}>{t('privacy.erase')}</h3>
        <p>{t('privacy.eraseBody')}</p>

        {/* What survives an erasure is stated before the request, not after.
            A student told "your data has been deleted" who later finds their
            disbursement record intact has been misled. */}
        {retained ? (
          <Notice tone="warn" title={t('privacy.requested')}>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {retained.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Notice>
        ) : (
          <button onClick={requestErasure} disabled={busy === 'erase'}>
            {t('privacy.erase')}
          </button>
        )}
      </section>
    </div>
  )
}
