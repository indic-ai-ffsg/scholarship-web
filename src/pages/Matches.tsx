import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { Empty, ErrorState, Loading, Notice, ResultCard } from '../components/ui'
import { applyRoute, externalHelpKey } from '../lib/apply'
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
 * The card itself is in components/ui, built to be shared:
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
          action={<Link className="btn primary" to="/register?edit">{t('profile.start')}</Link>}
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

      {/* The directory, as a link here rather than as a fifth item in the
          masthead. For a signed-in student /scholarships is this page with the
          answer taken out — the same schemes, in no particular order, with
          nothing saying which of them they qualify for — so it is not a place
          they move between. It is the escape hatch for "show me the ones you
          did not match", and it belongs beside the list it widens. */}
      <p className="breadcrumb"><Link to="/scholarships">{t('home.browseAll')}</Link></p>

      {profile.completeness_score < 60 && profile.next_steps?.length ? (
        <Notice tone="warn" title={t('profile.complete', { n: profile.completeness_score })}>
          {/* The single highest-weight gap, not all of them. The list is
              ordered by how many schemes each field unlocks. */}
          <p>{profile.next_steps[0].message}</p>
          <Link className="btn" to="/register?edit">{t('profile.continue')}</Link>
        </Notice>
      ) : null}

      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && matches.length === 0 && (
        /* Not a retry. Nothing failed here — query.error has that case and
           prints its own — so pressing "Try again" returns the same empty list
           and teaches a student that the button is decoration.
           *
           * The action offered depends on which of the two empty lists this is.
           * An incomplete profile is a thing the student can act on and the
           * likeliest reason a rule could not be evaluated; a complete one
           * leaves the directory, which is the only place with something to
           * show them. Offering "browse everything" to somebody whose profile
           * is half-written sends them to read four hundred schemes instead of
           * answering the one question that would have filtered them. */
        <Empty
          title={t('match.none')}
          hint={t('match.working')}
          action={profile.completeness_score < 100 ? (
            <Link className="btn primary" to="/register?edit">{t('profile.continue')}</Link>
          ) : (
            <Link className="btn" to="/scholarships">{t('home.browseAll')}</Link>
          )}
        />
      )}

      {actionable.length > 0 && (
        /* A section with a heading, matching the one below it. The list held
           the page's only cards and no heading of its own, which left the h3
           inside each card sitting directly under the h1. */
        <section style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{t('match.actionable')}</h2>
          <p className="muted">{t('match.actionableHelp')}</p>
          <ul role="list" className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {actionable.map(m => <li key={m.scholarship_id}><MatchCard match={m} /></li>)}
          </ul>
        </section>
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

  /* Where this card's Apply goes.
   *
   * This card had no such test. It drew `/apply/:id` for every scheme the
   * student was eligible for, including the ones applied for on a sponsor's own
   * site — and for those the press landed on the internal Apply screen, which
   * answers with a panel saying no application can be made here. The student
   * had done nothing wrong, had pressed the button their own matched list
   * offered, and was shown a refusal. That is the "external flow looks like a
   * failed application" failure at its worst, because this is the screen that
   * is supposed to be about them.
   *
   * The directory had the test and this did not, so the same scheme behaved
   * differently depending on which screen the student found it on. lib/apply.ts
   * is now the only copy. */
  const route = applyRoute(match)

  return (
    <ResultCard
      state={match.state}
      title={match.title}
      slug={match.slug}
      award={match.award_amount}
      benefit={match.benefit_summary}
      organisation={match.organisation_name}
      daysRemaining={match.days_remaining}
      nextAction={match.next_action}
      /* Replaces the state's own sentence for an off-site scheme, which is what
         the `help` slot is for: "you can apply for this" is true and the
         sentence a student needs is where, and that it will not turn up under
         their applications afterwards. Without it the card promises tracking
         the platform cannot deliver. */
      help={
        route.kind === 'external' && !match.already_applied
          ? t(externalHelpKey(route), { org: match.organisation_name })
          : undefined
      }
    >
      {match.already_applied ? (
        <Link className="btn" to={`/applications/${match.application_id}`}>
          {t('match.applied')}
        </Link>
      ) : !canApply(match.state) ? (
        /* Not eligible yet, so neither Apply branch applies. Hoisted above the
           two of them rather than repeated in both conditions, which is also
           what lets TypeScript narrow `route` to one variant below — a
           `canApply(...) && route.kind === 'external'` conjunction leaves the
           later branch holding a union with no `to` on it. */
        match.state === 'BLOCKED' ? (
          // The block is a document or a value, so the vault is where it is
          // cleared. A visitor running the public check has neither, which is
          // why that page offers this one nothing.
          <Link className="btn" to="/documents">{t('nav.documents')}</Link>
        ) : null
      ) : route.kind === 'external' ? (
        /* An anchor, and labelled as leaving. Same rules as the directory row:
           noopener/noreferrer, and the new tab announced rather than left to
           the arrow. */
        <a
          className="btn primary"
          href={route.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('public.applyExternal')}
          <span aria-hidden="true"> ↗</span>
          <span className="sr-only"> — {match.title} ({t('common.newTab')})</span>
        </a>
      ) : (
        <Link className="btn primary" to={route.to}>
          {t('match.apply')}
        </Link>
      )}
      {/* No "See details" beside it. The card's own title is a link to that
          same page, so the pair was one destination offered twice — and the
          second copy was a control sitting next to the single thing the card
          is actually asking the student to do, competing with it. One card,
          one action, and it is the action.

          An ineligible card therefore has no button at all, which is right:
          there is nothing to do about it except read the reason. */}
    </ResultCard>
  )
}
