import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { Empty, ErrorState, Loading, Notice, ResultCard } from '../components/ui'
import { canApply } from '../lib/eligibility'
import type { Match } from '../lib/types'

/* The matched scholarship list — the screen the whole backend exists to serve.
 *
 * The four states of Table 4.2 are the structure of this page, and BLOCKED is
 * the one that matters. The report calls it the state carrying the greatest
 * practical value, "since it converts an apparent dead end into a specific,
 * actionable task" — so a blocked scheme does not read as a rejection. It reads
 * as one instruction, in the same visual position as the Apply button on a
 * scheme the student already qualifies for.
 *
 * Ineligible schemes are shown last and shown anyway. Hiding them would leave a
 * student wondering whether the platform had simply missed something, and the
 * disclosed reason is often the thing that tells them which certificate to
 * chase for next year.
 *
 * The card itself is in components/ui, shared with the public eligibility check:
 * a visitor who ran that check before registering arrives here to the same cards
 * in the same order, which is the whole reason the check is worth running.
 */

export default function Matches() {
  const { t } = useI18n()
  const { profile } = useAuth()

  const query = useQuery<Match[]>(
    signal => api.get('/me/matches', { page_size: 100 }, signal),
    [],
  )

  if (!profile) {
    return (
      <div className="page">
        <Empty
          title={t('match.none')}
          hint={t('match.noneHint')}
          action={<Link className="btn primary" to="/profile">{t('profile.start')}</Link>}
        />
      </div>
    )
  }

  const matches = query.data ?? []
  const actionable = matches.filter(m => m.state !== 'NOT_ELIGIBLE')
  const closed = matches.filter(m => m.state === 'NOT_ELIGIBLE')

  return (
    <div className="page">
      <h1>{t('match.title')}</h1>
      <p className="lede">{t('match.lede')}</p>

      {profile.completeness_score < 60 && profile.next_steps?.length ? (
        <Notice tone="warn" title={t('profile.complete', { n: profile.completeness_score })}>
          {/* The single highest-weight gap, not all of them. The list is
              ordered by how many schemes each field unlocks. */}
          <p>{profile.next_steps[0].message}</p>
          <Link className="btn" to="/profile">{t('profile.continue')}</Link>
        </Notice>
      ) : null}

      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && matches.length === 0 && (
        <Empty
          title={t('match.none')}
          hint={t('match.working')}
          action={<button onClick={query.reload}>{t('common.retry')}</button>}
        />
      )}

      {actionable.length > 0 && (
        <ul role="list" className="stack" style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
          {actionable.map(m => <li key={m.scholarship_id}><MatchCard match={m} /></li>)}
        </ul>
      )}

      {closed.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{t('match.ineligible')}</h2>
          <p className="muted">{t('match.ineligibleHelp')}</p>
          <ul role="list" className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {closed.map(m => <li key={m.scholarship_id}><MatchCard match={m} /></li>)}
          </ul>
        </section>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const { t } = useI18n()

  return (
    <ResultCard
      state={match.state}
      title={match.title}
      slug={match.slug}
      award={match.award_amount}
      organisation={match.organisation_name}
      daysRemaining={match.days_remaining}
      nextAction={match.next_action}
    >
      {match.already_applied ? (
        <Link className="btn" to={`/applications/${match.application_id}`}>
          {t('match.applied')}
        </Link>
      ) : canApply(match.state) ? (
        <Link className="btn primary" to={`/apply/${match.scholarship_id}`}>
          {t('match.apply')}
        </Link>
      ) : match.state === 'BLOCKED' ? (
        // The block is a document or a value, so the vault is where it is
        // cleared. A visitor running the public check has neither, which is why
        // that page offers this one nothing.
        <Link className="btn" to="/documents">{t('nav.documents')}</Link>
      ) : null}

      <Link className="btn quiet" to={`/scholarships/${match.slug}`}>{t('match.view')}</Link>
    </ResultCard>
  )
}
