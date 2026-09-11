import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { dateTime } from '../lib/format'
import { trackOf } from '../lib/track'
import { Empty, ErrorState, Loading } from '../components/ui'
import ApplicationTrack from '../components/ApplicationTrack'
import OrgMark from '../components/OrgMark'
import type { Application } from '../lib/types'

/* Everything the student has applied for, and where each one has got to.
 *
 * This was a title, a sponsor, a reference and a state badge — accurate, and it
 * answered none of the three questions somebody opens this page with: did it go
 * through, has anything happened since, and is it my turn. The badge read
 * "Submitted" for as long as an application sat in review, which is weeks, and
 * a page that looks identical on every visit is a page that stops being
 * visited.
 *
 * So each row now carries the track (lib/track.ts), the sponsor's mark, and the
 * time as well as the date — because the doubt a student actually has is
 * whether the thing they pressed went through, and "11 Sept" does not settle it
 * when they pressed it twice.
 *
 * Ordering is the API's: newest first. Deliberately not grouped by state — an
 * awarded application and a refused one are both things that happened, and
 * sorting the refusals into a section at the bottom is a design that hides them
 * from the person they happened to.
 */
export default function Applications() {
  const { t } = useI18n()

  const query = useQuery<Application[]>(
    signal => api.get('/me/applications', { page_size: 50 }, signal),
    [],
  )

  const apps = query.data ?? []

  return (
    <div className="page">
      <h1>{t('appl.title')}</h1>

      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && apps.length === 0 && (
        <Empty
          title={t('appl.none')}
          hint={t('appl.noneHint')}
          action={<Link className="btn primary" to="/matches">{t('nav.matches')}</Link>}
        />
      )}

      {apps.length > 0 && (
        <ul role="list" className="appl-list">
          {apps.map(a => {
            const track = trackOf(a.current_state)

            return (
              <li key={a.application_id}>
                <article className={`card appl-card${track.waitingOnYou ? ' needs-you' : ''}`}>
                  <div className="appl-head">
                    <OrgMark organisationID={a.organisation_id} name={a.organisation_name} />

                    <div className="appl-title">
                      <h2>
                        {/* The title is the link, not the whole card: four
                            interactive-looking regions is something a keyboard
                            user has to tab through to find the one that works.
                            This is also the thing being named. */}
                        <Link to={`/applications/${a.application_id}`}>
                          {a.scholarship_title}
                        </Link>
                      </h2>
                      <p className="appl-meta">
                        {a.organisation_name}
                        {' · '}
                        <span className="sr-only">{t('appl.reference')} </span>
                        <span className="appl-ref">{a.reference_code}</span>
                      </p>
                    </div>

                    {/* The provider's own word for the stage, which the track
                        deliberately does not replace: a scheme that renames a
                        transition keeps its wording, and this is the only place
                        the student sees it. */}
                    <span className={`state-badge ${badgeTone(track.outcome, track.waitingOnYou)}`}>
                      {a.state_label}
                    </span>
                  </div>

                  <ApplicationTrack track={track} />

                  <p className="appl-when">
                    {track.finished && a.decided_at
                      ? t('appl.decidedOn', { when: dateTime(a.decided_at) })
                      : a.submitted_at
                        ? t('appl.sentOn', { when: dateTime(a.submitted_at) })
                        : ''}
                    {track.outcome !== 'none' && (
                      <>
                        {' · '}
                        <strong>{t(`appl.outcome${cap(track.outcome)}`)}</strong>
                      </>
                    )}
                  </p>

                  {/* The one state where the student has to do something. It
                      would be lost among the others without this. */}
                  {track.waitingOnYou && (
                    <p className="next-action">
                      <span className="mark" aria-hidden="true">!</span>
                      <span>
                        {t('appl.needsYou')}
                        {a.info_request_note ? ` — ${a.info_request_note}` : ''}
                      </span>
                    </p>
                  )}

                  {/* Why a refusal was given, where there is one. On the list
                      rather than only behind a click: it is the sentence the
                      whole application comes down to, and making somebody open
                      a page to read it is making them work for bad news. */}
                  {track.outcome === 'rejected' && a.decision_reason && (
                    <p className="appl-reason">{a.decision_reason}</p>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* Which colour the provider's state badge takes.
 *
 * Waiting-on-you wins over everything, because it is the only one that asks for
 * an act. Otherwise it follows the outcome, and an application still in flight
 * takes the neutral tone rather than a hopeful green — this badge reports a
 * stage, and colouring an in-progress application as good news is a promise
 * nobody here can keep.
 */
function badgeTone(outcome: string, waitingOnYou: boolean): string {
  if (waitingOnYou) return 'blocked'
  if (outcome === 'approved') return 'eligible'
  if (outcome === 'rejected') return 'ineligible'
  return 'likely'
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
