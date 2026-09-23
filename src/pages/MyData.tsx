import { useState } from 'react'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useAnnounce } from '../lib/announce'
import { useI18n } from '../lib/i18n-context'
import { date, humanise } from '../lib/format'
import { Empty, ErrorState, Loading, Notice } from '../components/ui'
import type { AccessEntry, Consent, DataRequest } from '../lib/types'

/* The access log, as the student reads it: by day, and within a day each
 * distinct thing that happened once, with how many times.
 *
 * The log is fifty rows of which most are the same row — "Indic AI scholarship
 * — viewed your profile" six times on one afternoon — and as a flat list it
 * was a screen and a half of repetition burying the three things on the page a
 * student can act on. Grouping keeps every fact (who, what, which document,
 * which day, how often) and drops only the repetition. Order is kept: days
 * newest first, and within a day the order each thing first appeared. */
interface AccessGroup { day: string; items: { entry: AccessEntry; count: number }[] }

function groupAccess(entries: AccessEntry[]): AccessGroup[] {
  const days: AccessGroup[] = []
  for (const e of entries) {
    // The reader's own calendar day, not the timestamp's UTC one: sliced from
    // the ISO string, anything between midnight and 05:30 in India landed
    // under the previous day's heading — which is shown in local time.
    const day = new Date(e.accessed_at).toLocaleDateString('en-CA')
    let g = days[days.length - 1]
    if (!g || g.day !== day) { g = { day, items: [] }; days.push(g) }
    const key = (x: AccessEntry) => `${x.organisation_name ?? ''}|${x.action}|${x.document_name ?? ''}`
    const same = g.items.find(it => key(it.entry) === key(e))
    if (same) same.count++
    else g.items.push({ entry: e, count: 1 })
  }
  return days
}

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
  const { t, locale } = useI18n()
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
  /* The student's own requests, so the window survives a reload.
   *
   * Without this the thirty days existed only in the response to the button:
   * close the tab and the portal forgot there was a request at all, while the
   * clock went on running. A student cannot be expected to act inside a window
   * the screen stops mentioning. */
  const requests = useQuery<DataRequest[]>(
    signal => api.get('/me/data-requests', undefined, signal), [],
  )

  /* The one open erasure, if there is one. RECEIVED and IN_PROGRESS are the
     two states in which it has not happened and can still be taken back. */
  const pendingErasure = (requests.data ?? []).find(
    r => r.request_type === 'ERASURE'
      && (r.status === 'RECEIVED' || r.status === 'IN_PROGRESS'),
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

  async function cancelErasure(requestId: string) {
    setBusy('cancel')
    try {
      await api.post(`/me/data-requests/${requestId}/cancel`)
      setRetained(null)
      requests.reload()
      setMessage(t('privacy.cancelled'))
      announce(t('privacy.cancelled'))
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
  const days = groupAccess(entries)
  const grants = consents.data ?? []

  return (
    <div className="page mydata">
      {/* The shared title band (components/page-hero). */}
      <header className="page-hero">
        <h1>{t('privacy.title')}</h1>
        <p className="lede">{t('privacy.lede')}</p>
      </header>

      {message && <Notice tone="info">{message}</Notice>}

      {/* Two columns where there is room: the record of who looked on one
          side, and on the other the three things the student can do about
          it — withdraw a consent, take a copy, delete. On a phone the record
          comes first, as it did. */}
      <div className="mydata-grid">
      <section className="card mydata-log" aria-labelledby="access">
        <h2 id="access">{t('privacy.access')}</h2>

        {access.loading && !access.data && <Loading />}
        {access.error ? <ErrorState error={access.error} onRetry={access.reload} /> : null}

        {access.data && entries.length === 0 && (
          <p className="muted mydata-none">{t('privacy.accessNone')}</p>
        )}

        {/* A timeline of days, each a list of what happened on it. Nested
            lists rather than headings, so a screen reader hears "list, 7
            items" for the days and the count of events inside each. The ×N is
            said as a number after the event — the same fact the flat list gave
            by repeating the row N times. */}
        {days.length > 0 && (
          <ol role="list" className="mydata-days">
            {days.map(g => (
              <li key={g.day} className="mydata-day">
                <p className="mydata-date">{date(g.items[0].entry.accessed_at, locale)}</p>
                <ul role="list" className="mydata-events">
                  {g.items.map(({ entry: e, count }, i) => (
                    <li key={i} className={e.document_name ? 'is-document' : undefined}>
                      <span className="mydata-event">
                        <strong>{e.organisation_name ?? t('app.name')}</strong>
                        {' — '}
                        {e.action_label.toLowerCase()}
                        {e.document_name && <>: <span className="mydata-doc">{e.document_name}</span></>}
                      </span>
                      {count > 1 && <span className="mydata-count">×{count}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mydata-actions">

      <section className="card mydata-consents" aria-labelledby="consents">
        <h2 id="consents">{t('privacy.consents')}</h2>

        {consents.loading && !consents.data && <Loading />}
        {grants.length === 0 && !consents.loading && (
          <p className="muted mydata-none">—</p>
        )}

        {grants.map(c => (
          <div key={c.consent_id} className="mydata-consent">
            <p className="mydata-consent-who">
              <strong>{c.organisation_name}</strong>
              {c.scholarship_title && <span className="muted"> · {c.scholarship_title}</span>}
            </p>

            {/* The exact field list, because "we share your details" is not
                consent to anything in particular — one chip per field, so the
                list is counted at a glance. */}
            <ul role="list" className="mydata-fields">
              {c.fields_shared.map(f => <li key={f}>{humanise(f)}</li>)}
            </ul>

            {c.active ? (
              <button className="quiet destructive" disabled={busy === c.consent_id} aria-busy={busy === c.consent_id || undefined} onClick={() => withdraw(c.consent_id)}>
                {busy === c.consent_id ? t('privacy.withdrawing') : t('privacy.withdraw')}
                <span className="sr-only"> — {c.organisation_name}</span>
              </button>
            ) : (
              <span className="muted">{t('privacy.withdraw')} ✓</span>
            )}
          </div>
        ))}
      </section>

      <section className="card mydata-export" aria-labelledby="rights">
        <h2 id="rights">{t('privacy.export')}</h2>
        <p>{t('privacy.exportBody')}</p>
        <button onClick={requestExport} disabled={busy === 'export'} aria-busy={busy === 'export' || undefined}>
          {busy === 'export' ? t('privacy.exporting') : t('privacy.export')}
        </button>
      </section>

      {/* Its own card and its own id. It shared id="rights" with the heading
          above, so the export section's aria-labelledby could resolve to either
          — and an id is meant to name one element. The red edge is the page's
          one irreversible action saying so before anything is pressed; the
          heading says it in words. */}
      <section className="card mydata-erase" aria-labelledby="erase">
        <h2 id="erase">{t('privacy.erase')}</h2>
        <p>{t('privacy.eraseBody')}</p>

        {/* What survives an erasure is stated before the request, not after.
            A student told "your data has been deleted" who later finds their
            disbursement record intact has been misled. */}
        {retained && (
          <Notice tone="warn" title={t('privacy.requested')}>
            <ul className="mydata-retained">
              {retained.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Notice>
        )}

        {/* The window, and the way out of it.
          *
          * Read from the server's list rather than from `retained`, so it is
          * here on a fresh visit and not only in the seconds after the button
          * was pressed. The heading says nothing has been deleted YET, which is
          * the single most important fact on this screen: a student who
          * believes it is already done will not come back inside the window. */}
        {pendingErasure ? (
          <Notice tone="warn" title={t('privacy.window')}>
            <p className="mydata-window">
              {pendingErasure.due_at
                ? t('privacy.windowBody', { date: date(pendingErasure.due_at, locale) })
                : t('privacy.eraseBody')}
            </p>
            {/* .row already gives the gap and the wrap; nothing to add. */}
            <div className="row">
              <button
                onClick={() => cancelErasure(pendingErasure.request_id)}
                disabled={busy === 'cancel'}
                aria-busy={busy === 'cancel' || undefined}
              >
                {busy === 'cancel' ? t('privacy.cancelling') : t('privacy.cancel')}
              </button>
              {/* Beside the cancel rather than under the export heading above:
                  this is the moment the copy is worth taking, and a student
                  reading a deletion date should not have to scroll back up to
                  find out they can keep one. */}
              <button
                onClick={requestExport}
                disabled={busy === 'export'}
                aria-busy={busy === 'export' || undefined}
              >
                {busy === 'export' ? t('privacy.exporting') : t('privacy.export')}
              </button>
            </div>
          </Notice>
        ) : (
          <button className="danger-outline" onClick={requestErasure} disabled={busy === 'erase'} aria-busy={busy === 'erase' || undefined}>
            {busy === 'erase' ? t('privacy.erasing') : t('privacy.erase')}
          </button>
        )}
      </section>
      </div>
      </div>
    </div>
  )
}
