import { useState } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { dateTime } from '../lib/format'
import { trackOf } from '../lib/track'
import { Empty, ErrorState, Loading } from '../components/ui'
import ApplicationTrack from '../components/ApplicationTrack'
import OrgMark from '../components/OrgMark'
import type { Application, Referral } from '../lib/types'

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

  /* Schemes we sent them to, which the applications list knows nothing about.
   *
   * Its own request rather than a field on the applications response: these are
   * different records with different certainty, and folding them into one
   * payload is the first step towards a list that renders them alike. The
   * student thinks of both as "what I have applied for", so they share a page —
   * and are kept plainly apart on it. */
  const referrals = useQuery<Referral[]>(
    signal => api.get('/me/referrals', undefined, signal),
    [],
  )

  const apps = query.data ?? []
  const sent = referrals.data ?? []

  return (
    <div className="page">
      <h1>{t('appl.title')}</h1>

      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && apps.length === 0 && sent.length === 0 && (
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
      {sent.length > 0 && (
        <section className="ref-section" aria-labelledby="sent">
          <h2 id="sent">{t('ref.heading')}</h2>
          <p className="muted ref-blurb">{t('ref.blurb')}</p>

          <ul role="list" className="appl-list">
            {sent.map(r => (
              <li key={r.referral_id}>
                <ReferralCard referral={r} onChanged={referrals.reload} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* One scheme we sent a student to.
 *
 * The card says what the platform actually knows — that it opened the sponsor's
 * site for them, and when — and then asks. It never asserts an outcome, because
 * there is nothing here that could have observed one.
 */
function ReferralCard({ referral: r, onChanged }: {
  referral: Referral
  onChanged: () => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)

  const said = r.self_reported_outcome

  async function say(outcome: string) {
    setBusy(true)
    try {
      await api.patch('/me/referrals', {
        scholarship_id: r.scholarship_id,
        outcome,
      })
      setAsking(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card appl-card">
      <div className="appl-head">
        <OrgMark name={r.organisation_name} />
        <div className="appl-title">
          <h3>{r.scholarship_title}</h3>
          <p className="appl-meta">{r.organisation_name}</p>
        </div>
        {r.external_url && (
          <a
            className="btn sm ref-open"
            href={r.external_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('ref.open')}
            <span aria-hidden="true"> ↗</span>
            <span className="sr-only"> ({t('common.newTab')})</span>
          </a>
        )}
      </div>

      <p className="appl-when">
        {t('ref.sentOn', { when: dateTime(r.referred_at) })}
        {r.times > 1 && ` · ${t('ref.again', { times: String(r.times) })}`}
      </p>

      {/* Attributed, always. "You told us" is the whole difference between this
          and the applications above it, and it is never dropped for brevity. */}
      {said && !asking ? (
        <p className="ref-said">
          {t('ref.youSaid', { what: t(`ref.said${said}`) })}
          <button className="btn-link" onClick={() => setAsking(true)}>
            {t('ref.change')}
          </button>
        </p>
      ) : (
        <div className="ref-ask">
          <p>{t('ref.what')}</p>
          <div className="ref-options">
            {(['APPLIED', 'AWARDED', 'NOT_AWARDED', 'DID_NOT_APPLY'] as const).map(o => (
              <button
                key={o}
                className="btn sm"
                disabled={busy}
                onClick={() => say(o)}
              >
                {t(`ref.${o}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
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
