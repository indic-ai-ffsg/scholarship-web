import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { stepDestination } from '../lib/questions'
import { trackOf } from '../lib/track'
import { money, shortDate } from '../lib/format'
import { Empty, ErrorState, Loading, Notice } from '../components/ui'
import { IconForm, IconShield, IconYes } from '../components/icons'
import OrgMark from '../components/OrgMark'
import type { Application, Summary } from '../lib/types'

/* The student's hub — the screen both branches of the sign-in flow converge on.
 *
 * Its job is orientation, not depth. A student arriving here should be able to
 * answer three questions without reading anything twice: is my profile good
 * enough to be matched, is anything waiting on me, and what happened to what I
 * already sent. Every figure is a doorway to the page that does the actual
 * work; nothing here is the only place to do anything.
 *
 * The numbers come from /me/summary, which the backend already computes in a
 * single round trip. The recent rows come from the list endpoint separately,
 * because the summary carries counts and not rows — counts answer "how am I
 * doing", rows answer "what happened to the one I sent last week", and a hub
 * that answered only the first would send people elsewhere to find out.
 *
 * Everything a student must act on is placed above the figures, deliberately.
 * Somebody with a document about to expire is not helped by a tidy grid of
 * numbers, and the one thing they need to do should not be something they have
 * to go looking for.
 */

export default function Dashboard() {
  const { t, locale } = useI18n()
  const { profile } = useAuth()

  /* Both endpoints are behind RequireStudent, which a student without a profile
   * does not satisfy. The hooks run before the early return below can stop
   * them, so the fetchers themselves stand down rather than firing two requests
   * that are certain to be refused — which is the ordinary first-run path, not
   * an edge case. */
  const summary = useQuery<Summary | null>(
    signal => profile
      ? api.get('/me/summary', undefined, signal)
      : Promise.resolve({ data: null }),
    [profile?.profile_id],
  )
  const recent = useQuery<Application[]>(
    signal => profile
      ? api.get('/me/applications', { page_size: 5 }, signal)
      : Promise.resolve({ data: [] }),
    [profile?.profile_id],
  )

  /* RequireProfile already turns a profile-less student away at the route, so
     this is unreachable in practice. It is kept as the same redirect rather
     than as a second, differently-worded empty state: if the guard is ever
     loosened, the answer to "registered but not finished" should stay one
     answer given in one place. */
  if (!profile) return <Navigate to="/register?edit" replace />

  const s = summary.data
  const applications = recent.data ?? []
  const openMatches = s ? s.matches.eligible + s.matches.likely_eligible : 0
  /* next_steps is ordered by how many schemes each missing field unlocks, so
     the first is the highest-value thing this student could do next. */
  const nextField = profile.next_steps?.[0]?.field ?? ''

  return (
    <div className="page dash">
      {/* The shared title band (components/page-hero), as on the directory. */}
      <header className="page-hero">
        <h1>{t('dash.title')}</h1>
        <p className="lede">{t('dash.lede')}</p>
      </header>

      {/* Completeness as a meter, not as a warning.
       *
       * One instruction, not a list: next_steps is ordered by how many schemes
       * each missing field unlocks, so the first entry is the highest-value
       * thing this student could do next.
       *
       * The amber Notice this used to be is kept below for the two things that
       * genuinely wait on the student. A profile at 92% is progress, and a page
       * that shouts at somebody for the 8% teaches them to ignore the colour
       * that means "act on this". */}
      {profile.completeness_score < 100 ? (
        <section className="card progress-panel" aria-labelledby="profile-progress">
          <h2 id="profile-progress">{t('dash.profileTitle')}</h2>

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

          {/* The button goes where the step is done, and says so. "Continue
              where you left off" is the right words for an unfinished form and
              the wrong ones for a document somebody has to upload. */}
          <div className="actions">
            <Link className="btn primary" to={stepDestination(nextField)}>
              {nextField === 'documents' ? t('doc.upload') : t('profile.continue')}
            </Link>
          </div>
        </section>
      ) : null}

      {/* The two things that wait on the student, side by side where there is
          room, as strips rather than two full-width amber boxes. They are the
          only amber on the page, so they are still the first thing the eye
          finds; they no longer push the figures a screen down to be found. */}
      {s && (s.applications.draft > 0 || s.documents_expiring_soon > 0) && (
      <div className="dash-alerts">
      {s.applications.draft > 0 && (
        <Notice tone="warn" title={t('dash.draftsTitle', { n: s.applications.draft })}>
          <p>{t('dash.draftsBody')}</p>
          <Link className="btn" to="/applications">{t('dash.draftsAction')}</Link>
        </Notice>
      )}

      {s.documents_expiring_soon > 0 && (
        <Notice tone="warn" title={t('dash.expiringTitle', { n: s.documents_expiring_soon })}>
          {/* The count reaches the body as well as the title: it is the body
              that says "it" or "them". */}
          <p>{t('dash.expiringBody', { n: s.documents_expiring_soon })}</p>
          <Link className="btn" to="/documents">{t('dash.expiringAction')}</Link>
        </Notice>
      )}
      </div>
      )}

      {summary.loading && !s && <Loading />}
      {summary.error ? <ErrorState error={summary.error} onRetry={summary.reload} /> : null}

      {s && (
        <ul role="list" className="figures">
          <Figure
            to="/matches"
            label={t('dash.matches')}
            value={openMatches}
            hint={
              s.matches.blocked > 0
                ? t('dash.matchesBlocked', { n: s.matches.blocked })
                : t('dash.matchesHint')
            }
            go={t('dash.matchesGo')}
            icon={<IconYes />}
          />
          <Figure
            to="/applications"
            label={t('dash.applications')}
            value={s.applications.in_progress}
            /* The breakdown only once there is one. A student who has sent
                nothing is told "Nothing sent yet" rather than counted three
                zeros at. */
            hint={s.applications.approved + s.applications.rejected > 0
              ? t('dash.applicationsHint', {
                approved: s.applications.approved,
                rejected: s.applications.rejected,
              })
              : t('dash.applicationsNone')}
            go={t('dash.applicationsGo')}
            icon={<IconForm />}
          />
          <Figure
            to="/documents"
            label={t('dash.documents')}
            value={s.documents_verified}
            hint={t('dash.documentsHint')}
            go={t('dash.documentsGo')}
            icon={<IconShield />}
          />
        </ul>
      )}

      {/* Its own row rather than a fourth figure. This is the number a student
          cannot get anywhere else — their funding history across every provider
          — and it reads as a total, not as another count of things to do. */}
      {/* The money and the recent applications side by side on a wide
          window: the total is one number and a line, and on its own full-width
          row it was a card of white space with a figure in the corner. The
          classes replace inline styles that sized it by hand. */}
      <div className={`dash-split${s && (s.total_received > 0 || s.total_sanctioned > 0) ? '' : ' one'}`}>
      {s && (s.total_received > 0 || s.total_sanctioned > 0) && (
        <section className="card dash-funding" aria-labelledby="dash-funding">
          <span className="dash-funding-icon" aria-hidden="true">💰</span>
          <h2 id="dash-funding">{t('dash.funding')}</h2>
          <p className="dash-funding-amount">{money(s.total_received)}</p>
          <p className="muted dash-funding-hint">
            {t('dash.fundingHint', { sanctioned: money(s.total_sanctioned) })}
          </p>
        </section>
      )}

      <section className="dash-recent-section">
        <div className="dash-head">
          <h2>{t('dash.recent')}</h2>
          {applications.length > 0 && (
            <Link to="/applications">{t('dash.allApplications')}</Link>
          )}
        </div>

        {recent.loading && !recent.data && <Loading />}
        {recent.error ? <ErrorState error={recent.error} onRetry={recent.reload} /> : null}

        {/* The empty state carries the only "find scholarships" on the page.
            There were two, four hundred pixels apart: this one and a full-width
            button at the foot, which is the same instruction given twice to
            somebody who has not yet decided to follow it once. */}
        {recent.data && applications.length === 0 && (
          <div className="card">
            <Empty
              title={t('dash.noApplications')}
              hint={t('dash.noApplicationsHint')}
              action={<Link className="btn primary" to="/matches">{t('dash.findScholarships')}</Link>}
            />
          </div>
        )}

        {/* One list in one card, a row per application: the sponsor's mark,
            the scheme and when it went, and where it stands. Five separate
            cards for five one-line facts was five borders round nothing. */}
        {applications.length > 0 && (
          <ul role="list" className="card dash-recent">
            {applications.map(a => (
              <li key={a.application_id}>
                <OrgMark organisationID={a.organisation_id} name={a.organisation_name} />
                <div className="dash-recent-text">
                  <h3>
                    <Link to={`/applications/${a.application_id}`}>
                      {a.scholarship_title ?? a.reference_code}
                    </Link>
                  </h3>
                  {a.submitted_at && (
                    <span className="muted">{shortDate(a.submitted_at, locale)}</span>
                  )}
                </div>
                <RecentBadge application={a} />
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>

    </div>
  )
}

/* A stat card that is also a doorway.
 *
 * Reuses the .figure pattern in components/figure.css, so the dashboard
 * inherits its spacing, its accent rule and its dark-mode handling rather than
 * growing a parallel set of tile styles that drift apart later. */
function Figure({ to, label, value, hint, go, icon }: {
  to: string; label: string; value: number; hint: string; go: string
  /* A glyph beside the label, decorative: the label says what is counted. */
  icon?: ReactNode
}) {
  return (
    <li>
      <Link className="figure figure-link" to={to}>
        {/* The icon inside the label's row, not a row of its own: the tile is
            a three-row subgrid (label, value, hint), and a fourth child would
            break the alignment the row of tiles shares. */}
        <span className="figure-label">
          {icon && <span className="figure-icon" aria-hidden="true">{icon}</span>}
          {label}
        </span>
        <strong>{value}</strong>
        <span className="figure-tail">
          <span className="muted">{hint}</span>
          {/* What pressing the tile does, said in words. A card that changes
              colour under a pointer tells a mouse user it is a target and tells
              a keyboard or screen-reader user nothing; this is the part that
              works for everybody. */}
          <span className="go-row">
            {go}<span className="go" aria-hidden="true">→</span>
          </span>
        </span>
      </Link>
    </li>
  )
}

/* The status on a recent application, by the applications page's rule: the
 * provider's word while it is moving, the outcome once it is decided. "closed"
 * on an application that was awarded read as a refusal, and the two pages
 * must not disagree about the same application. Only INFO_REQUESTED is the
 * student's move, and it keeps the amber that says so. */
const OUTCOME_KEY: Record<string, string> = {
  approved: 'appl.outcomeApproved',
  rejected: 'appl.outcomeRejected',
  withdrawn: 'appl.outcomeWithdrawn',
}
function RecentBadge({ application: a }: { application: Application }) {
  const { t } = useI18n()
  const track = trackOf(a.current_state)
  const tone = track.waitingOnYou ? 'blocked'
    : track.outcome === 'approved' ? 'eligible'
      : track.outcome === 'rejected' ? 'ineligible'
        : 'likely'
  return (
    <span className={`state-badge ${tone}`}>
      {track.finished ? t(OUTCOME_KEY[track.outcome]) : a.state_label}
    </span>
  )
}
