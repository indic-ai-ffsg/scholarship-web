import { Link, Navigate } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { money, shortDate } from '../lib/format'
import { Empty, ErrorState, Loading, Notice } from '../components/ui'
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
  const { t } = useI18n()
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
  if (!profile) return <Navigate to="/profile/setup" replace />

  const s = summary.data
  const applications = recent.data ?? []
  const openMatches = s ? s.matches.eligible + s.matches.likely_eligible : 0

  return (
    <div className="page">
      <h1>{t('dash.title')}</h1>
      <p className="lede">{t('dash.lede')}</p>

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

          <div className="actions">
            <Link className="btn primary" to="/profile/setup">{t('profile.continue')}</Link>
          </div>
        </section>
      ) : null}

      {s && s.applications.draft > 0 && (
        <Notice tone="warn" title={t('dash.draftsTitle', { n: s.applications.draft })}>
          <p>{t('dash.draftsBody')}</p>
          <Link className="btn" to="/applications">{t('dash.draftsAction')}</Link>
        </Notice>
      )}

      {s && s.documents_expiring_soon > 0 && (
        <Notice tone="warn" title={t('dash.expiringTitle', { n: s.documents_expiring_soon })}>
          <p>{t('dash.expiringBody')}</p>
          <Link className="btn" to="/documents">{t('dash.expiringAction')}</Link>
        </Notice>
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
          />
          <Figure
            to="/applications"
            label={t('dash.applications')}
            value={s.applications.in_progress}
            hint={t('dash.applicationsHint', {
              approved: s.applications.approved,
              rejected: s.applications.rejected,
            })}
            go={t('dash.applicationsGo')}
          />
          <Figure
            to="/documents"
            label={t('dash.documents')}
            value={s.documents_verified}
            hint={t('dash.documentsHint')}
            go={t('dash.documentsGo')}
          />
        </ul>
      )}

      {/* Its own row rather than a fourth figure. This is the number a student
          cannot get anywhere else — their funding history across every provider
          — and it reads as a total, not as another count of things to do. */}
      {s && (s.total_received > 0 || s.total_sanctioned > 0) && (
        <section className="card" style={{ marginTop: 'var(--gap)' }}>
          <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>{t('dash.funding')}</h2>
          <p style={{ fontSize: 'var(--step-3)', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
            {money(s.total_received)}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {t('dash.fundingHint', { sanctioned: money(s.total_sanctioned) })}
          </p>
        </section>
      )}

      <section>
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

        {applications.length > 0 && (
          <ul role="list" className="stack plain">
            {applications.map(a => (
              <li key={a.application_id}>
                <article className="card">
                  <h3 style={{ marginTop: 0 }}>
                    <Link to={`/applications/${a.application_id}`}>
                      {a.scholarship_title ?? a.reference_code}
                    </Link>
                  </h3>
                  <div className="row">
                    {/* Same rule as the applications list: only INFO_REQUESTED
                        is the student's move, and it is the one state that must
                        not look like routine progress. */}
                    <span className={`state-badge ${
                      a.current_state === 'INFO_REQUESTED' ? 'blocked' : 'likely'
                    }`}>{a.state_label}</span>
                    {a.submitted_at && (
                      <span className="muted">{shortDate(a.submitted_at)}</span>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* One hand-off, not two stacked full-width buttons.
       *
       * "Find scholarships" was here as well as in the empty state above, and
       * the pair of them read as the page's conclusion when the page's actual
       * conclusion is whatever the student came to check. Editing details is
       * reachable from the tile above, the account menu and the profile link;
       * it does not need a full-width button of its own at the foot. */}
      <nav className="dash-foot" aria-label={t('dash.title')}>
        <Link className="btn" to="/profile">{t('dash.editDetails')}</Link>
      </nav>
    </div>
  )
}

/* A stat card that is also a doorway.
 *
 * Reuses the .figure pattern the impact page already uses, so the dashboard
 * inherits its spacing, its accent rule and its dark-mode handling rather than
 * growing a parallel set of tile styles that drift apart later. */
function Figure({ to, label, value, hint, go }: {
  to: string; label: string; value: number; hint: string; go: string
}) {
  return (
    <li>
      <Link className="figure figure-link" to={to}>
        <span className="figure-label">{label}</span>
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
