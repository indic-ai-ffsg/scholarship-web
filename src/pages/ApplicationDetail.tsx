import { useParams } from 'react-router-dom'

import * as api from '../lib/api'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { date, money } from '../lib/format'
import { ErrorState, Loading, Notice } from '../components/ui'
import type { Application, TimelineEvent } from '../lib/types'

/* One application, and what happens next.
 *
 * Table 4.1 asks the student portal for a "persistent 'what happens next'
 * status". That is the first thing on this page, before the history, because a
 * student opening it wants to know whether they need to do something — not to
 * read a log.
 *
 * The timeline names the organisation that acted, never the individual officer.
 * The audit trail holds the person for compliance purposes; exposing which
 * named officer rejected an application invites pressure on them and tells the
 * applicant nothing they can use.
 */

const WHAT_NEXT: Record<string, string> = {
  SUBMITTED: 'The provider has your application. They will check your documents first.',
  DOCUMENT_CHECK: 'They are checking your documents. Nothing is needed from you.',
  VERIFIED: 'Your documents are confirmed. Your application goes to a reviewer next.',
  UNDER_REVIEW: 'A reviewer is reading your application. This is usually the longest step.',
  INFO_REQUESTED: 'They have asked you for something. Your application waits until you reply.',
  SHORTLISTED: 'You are on the shortlist. A final decision comes next.',
  APPROVED: 'Approved. The provider will record the sanction, then arrange payment.',
  SANCTIONED: 'The money has been sanctioned. Payment is arranged through their bank.',
  DISBURSED: 'Payment has been recorded. If it has not reached your account in a few working days, raise a grievance.',
  REJECTED: 'This application was not successful. It does not affect your others.',
  CLOSED: 'This application is complete.',
  WITHDRAWN: 'You withdrew this application.',
}

export default function ApplicationDetail() {
  const { applicationId } = useParams()
  const { t } = useI18n()

  const query = useQuery<{ application: Application; timeline: TimelineEvent[] }>(
    signal => api.get(`/applications/${applicationId}`, undefined, signal),
    [applicationId],
  )

  if (query.loading) return <div className="page"><Loading /></div>
  if (query.error) return <div className="page"><ErrorState error={query.error} onRetry={query.reload} /></div>
  if (!query.data) return null

  const { application: a, timeline } = query.data
  const next = WHAT_NEXT[a.current_state]
  const needsYou = a.current_state === 'INFO_REQUESTED'
  const rejected = a.current_state === 'REJECTED'

  return (
    <div className="page">
      <h1>{a.scholarship_title}</h1>
      <p className="lede">
        {a.organisation_name}
        {a.award_amount ? ` · ${money(a.award_amount)}` : ''}
      </p>
      <p className="muted">{t('appl.reference')}: {a.reference_code}</p>

      <Notice
        tone={needsYou ? 'warn' : rejected ? 'danger' : 'info'}
        title={t('appl.whatNext')}
      >
        <p>{next ?? a.state_label}</p>

        {a.info_request_note && <p><strong>{a.info_request_note}</strong></p>}
        {/* A rejection reason is mandatory server-side, and is the one thing
            worth reading on a page nobody wants to open. */}
        {rejected && a.decision_reason && <p>{a.decision_reason}</p>}
      </Notice>

      <section className="card" aria-labelledby="history">
        <h2 id="history" style={{ fontSize: 'var(--step-1)' }}>{t('appl.history')}</h2>

        <ol className="timeline">
          {timeline.map((e, i) => (
            <li key={e.event_id} className={i === timeline.length - 1 ? 'current' : 'done'}>
              <span className="dot" aria-hidden="true" />
              <span>
                <strong>{e.label}</strong>
                <span className="when" style={{ display: 'block' }}>
                  {date(e.created_at)}
                  {e.actor_organisation ? ` · ${e.actor_organisation}` : ''}
                </span>
                {e.reason && <span style={{ display: 'block' }}>{e.reason}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
