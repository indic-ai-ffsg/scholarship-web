import { useParams } from 'react-router-dom'

import * as api from '../lib/api'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { usePageTitle } from '../lib/page-title'
import { dateTime, money, sentenceCase } from '../lib/format'
import { trackOf } from '../lib/track'
import { ErrorState, Loading } from '../components/ui'
import ApplicationTrack from '../components/ApplicationTrack'
import OrgMark from '../components/OrgMark'
import type { Application, TimelineEvent } from '../lib/types'

/* One application: where it has got to, and everything that has happened to it.
 *
 * Table 4.1 asks the student portal for a "persistent 'what happens next'
 * status", and that is still the first thing on the page — a student opening it
 * wants to know whether they need to do something, not to read a log.
 *
 * What changed is everything around it. The page was a heading, a notice and a
 * flat list, and the list was where it fell down: nine entries reading
 * "submitted / document check / verified", all lower case because the server's
 * label is built to sit mid-sentence, all stamped with the same date because
 * the date carried no time. An application that moved through nine stages in
 * four minutes looked like nine things that happened at once, in a column of
 * words that read as unfinished.
 *
 * So: the track at the top, because "how far along is this" is the question;
 * the facts as a proper list rather than a run-on line; and a timeline with
 * times on it, sentence-cased, with each actor named and any remark set apart
 * as the aside it is.
 *
 * The timeline names the organisation that acted, never the individual officer.
 * The audit trail holds the person for compliance purposes; exposing which
 * named officer rejected an application invites pressure on them and tells the
 * applicant nothing they can use.
 */

const WHAT_NEXT: Record<string, string> = {
  SUBMITTED: 'The provider has your application. A reviewer will read it next.',
  UNDER_REVIEW: 'A reviewer is reading your application. This is usually the longest step.',
  INFO_REQUESTED: 'They have asked you for something. Your application waits until you reply.',
  /* The three stages migration 0057 retired. No application reaches them any
     more; the ones that were already in them are why these lines stay. */
  DOCUMENT_CHECK: 'Your application is with a reviewer. Nothing is needed from you.',
  VERIFIED: 'Your application is with a reviewer. Nothing is needed from you.',
  SHORTLISTED: 'Your application is with a reviewer. A decision comes next.',
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

  /* Before the early returns below, because it is a hook. Undefined while the
     request is in flight, which leaves the route's own title standing rather
     than blanking the tab for a second. */
  usePageTitle(query.data
    ? t('app.yourApplication', { title: query.data.application.scholarship_title ?? query.data.application.reference_code })
    : null)

  if (query.loading) return <div className="page"><Loading /></div>
  if (query.error) return <div className="page"><ErrorState error={query.error} onRetry={query.reload} /></div>
  if (!query.data) return null

  const { application: a, timeline } = query.data
  const track = trackOf(a.current_state)
  const next = WHAT_NEXT[a.current_state]

  return (
    <div className="page">
      <header className="appd-head">
        <OrgMark organisationID={a.organisation_id} name={a.organisation_name} />
        <div>
          <h1>{a.scholarship_title}</h1>
          <p className="appd-org">{a.organisation_name}</p>
        </div>
      </header>

      {/* The status panel: how far along, then what that means.
          *
          * One block rather than a track and a separate notice, because they
          * are two halves of one answer and a reader who sees the dots is
          * already asking the question the sentence answers. The tone follows
          * the outcome, so a refusal does not arrive in the same calm blue as
          * a document check. */}
      <section className={`appd-status tone-${statusTone(track, a.current_state)}`}>
        <ApplicationTrack track={track} />

        <div className="appd-status-body">
          <h2>
            {track.outcome !== 'none'
              ? t(`appl.outcome${cap(track.outcome)}`)
              : t('appl.whatNext')}
          </h2>
          <p>{next ?? a.state_label}</p>

          {/* What they asked for, in their words. Bold because it is the one
              sentence on the page that asks the reader to do something. */}
          {a.info_request_note && (
            <p className="appd-ask"><strong>{a.info_request_note}</strong></p>
          )}

          {/* A rejection reason is mandatory server-side, and is the one thing
              worth reading on a page nobody wants to open. */}
          {track.outcome === 'rejected' && a.decision_reason && (
            <p className="appd-reason">{a.decision_reason}</p>
          )}
        </div>
      </section>

      {/* The facts, as pairs. They were a run-on line under the heading —
          sponsor, award and reference separated by middots — which reads
          quickly and is impossible to scan back to when somebody on a helpline
          asks for the reference. */}
      <dl className="appd-facts">
        <div>
          <dt>{t('appl.reference')}</dt>
          <dd className="appd-ref">{a.reference_code}</dd>
        </div>
        {a.award_amount ? (
          <div>
            <dt>{t('appl.award')}</dt>
            <dd>{money(a.award_amount)}</dd>
          </div>
        ) : null}
        {a.submitted_at && (
          <div>
            <dt>{t('appl.applied')}</dt>
            <dd>{dateTime(a.submitted_at)}</dd>
          </div>
        )}
        {a.decided_at && (
          <div>
            <dt>{t('appl.decided')}</dt>
            <dd>{dateTime(a.decided_at)}</dd>
          </div>
        )}
      </dl>

      <section aria-labelledby="history">
        <h2 id="history" className="appd-history-head">{t('appl.history')}</h2>

        {timeline.length === 0 ? (
          <p className="muted">{t('appl.noHistory')}</p>
        ) : (
          <ol className="appd-timeline">
            {timeline.map((e, i) => (
              <li key={e.event_id} className={i === timeline.length - 1 ? 'is-latest' : ''}>
                <span className="appd-dot" aria-hidden="true" />

                <div className="appd-entry">
                  <p className="appd-entry-head">
                    <strong>{sentenceCase(e.label)}</strong>
                    <span className="appd-when">{dateTime(e.created_at)}</span>
                  </p>

                  {/* Who acted, when that is somebody other than the reader.
                      *
                      * A student's own submission used to render "You" under
                      * it, which tells them what they already know and puts a
                      * line of chrome under the one entry that needs none. No
                      * organisation and not automatic means it was them, and
                      * the absence says so. */}
                  {(e.is_system || e.actor_organisation) && (
                    <p className="appd-actor">
                      {e.is_system ? t('appl.automatic') : e.actor_organisation}
                    </p>
                  )}

                  {/* Set apart rather than run on. These are remarks somebody
                      typed while moving the application — often two words —
                      and inline they read as part of the stage's name. */}
                  {e.reason && <p className="appd-note">{e.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

/* Which tone the status panel takes.
 *
 * Waiting-on-you first, because it is the only state that asks for an act and
 * it must not be coloured like progress. Then the outcome. An application still
 * moving is neutral rather than hopeful: the panel reports a stage, and green
 * on something undecided is a promise nobody here can keep.
 */
function statusTone(track: ReturnType<typeof trackOf>, state: string): string {
  if (track.waitingOnYou || state === 'INFO_REQUESTED') return 'ask'
  if (track.outcome === 'rejected') return 'no'
  if (track.outcome === 'approved') return 'yes'
  return 'wait'
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
