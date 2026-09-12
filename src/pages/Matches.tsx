import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { awardLabel, deadlineLabel } from '../lib/format'
import { Empty, ErrorState, Loading } from '../components/ui'
import { applyRoute, externalHelpKey } from '../lib/apply'
import { canApply, stateClass, stateLabelKey, stateMark } from '../lib/eligibility'
import type { Match, Reason } from '../lib/types'

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
 * ---------------------------------------------------------------------------
 * Why the card is a row and not a card
 * ---------------------------------------------------------------------------
 *
 * It was a stack of full-width cards, each about four hundred pixels tall, so
 * three schemes filled a laptop screen and a student with fourteen matches
 * scrolled through six of them to find out whether any were closing. The six
 * questions a student actually arrives with — do I qualify, what is it, how
 * much, when does it close, why do I qualify, where do I apply — were answered
 * in that order down the card, which is the order you read a document in and
 * not the order you scan a list in.
 *
 * The row answers them across instead: state, then the scheme, then the facts
 * you compare between rows, then the one action. Everything that is comparable
 * between two schemes now sits in the same column on both, which is the only
 * property that makes a list of fourteen scannable at all.
 */

/* Which subset of the matches is on screen.
 *
 * The keys are eligibility, not windows, and that is a deliberate departure
 * from the brief this was built to. "Open now" and "Not open yet" describe a
 * scheme's dates; every scheme in this list is already open, because
 * ListMatches joins the public view, which admits a scheme only once it has
 * opened and before it closes. A filter for a set that is always empty is a
 * control that teaches a student the filters do not work.
 *
 * So the four here are the four states the engine actually produces, plus the
 * one cut across them a student genuinely plans around: what is closing.
 */
const FILTERS = [
  { key: 'all', label: 'match.filterAll' },
  { key: 'qualify', label: 'match.filterQualify' },
  { key: 'step', label: 'match.filterStep' },
  { key: 'closing', label: 'match.filterClosing' },
  { key: 'no', label: 'match.filterNo' },
] as const

type FilterKey = typeof FILTERS[number]['key']

/* Closing inside a month. The same band format.deadlineLabel colours at, so the
   count on the filter and the ink on the row agree about what "closing" means. */
const isClosing = (m: Match) =>
  m.days_remaining !== undefined && m.days_remaining >= 0 && m.days_remaining <= 30

const inFilter = (m: Match, key: FilterKey): boolean => {
  switch (key) {
    case 'qualify': return m.state === 'ELIGIBLE' || m.state === 'LIKELY_ELIGIBLE'
    case 'step': return m.state === 'BLOCKED'
    case 'closing': return isClosing(m)
    case 'no': return m.state === 'NOT_ELIGIBLE'
    default: return true
  }
}

export default function Matches() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const [filter, setFilter] = useState<FilterKey>('all')

  const query = useQuery<Match[]>(
    signal => api.get('/me/matches', { page_size: 100 }, signal),
    [],
  )

  const matches = useMemo(() => query.data ?? [], [query.data])

  /* Counted over every match, not over the filtered set: a filter chip showing
     the size of the list it would produce is the only figure that makes the row
     worth pressing. */
  const counts = useMemo(() => ({
    all: matches.length,
    qualify: matches.filter(m => inFilter(m, 'qualify')).length,
    step: matches.filter(m => inFilter(m, 'step')).length,
    closing: matches.filter(m => inFilter(m, 'closing')).length,
    no: matches.filter(m => inFilter(m, 'no')).length,
  }), [matches])

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

  /* Ordered so the ones a student can act on come first, and within that by the
     engine's own score. The server already sorts by state and score; this keeps
     the order stable when a filter removes rows from the middle of it. */
  const shown = matches.filter(m => inFilter(m, filter))

  return (
    <div className="page">
      <section className="match-hero">
        <div className="match-hero-say">
          <h1>{t('match.title')}</h1>
          <p>{t('match.lede')}</p>
        </div>

        {query.data && matches.length > 0 && (
          <ul role="list" className="match-figures">
            <Figure n={counts.qualify} label={t('match.figQualify')} tone="eligible" />
            <Figure n={counts.step} label={t('match.figStep')} tone="blocked" />
            <Figure n={counts.closing} label={t('match.figClosing')} tone="closing" />
            <Figure n={counts.no} label={t('match.figNo')} tone="ineligible" />
          </ul>
        )}

        {/* The profile nudge, inside the hero rather than as a banner above the
            list. It is the one thing that changes what this page contains, and
            it is context for the figures beside it — not an interruption. */}
        {profile.completeness_score < 100 && (
          <p className="match-hero-profile">
            <strong>{t('profile.complete', { n: profile.completeness_score })}</strong>
            {' '}
            {profile.next_steps?.length
              ? profile.next_steps[0].message
              : t('match.moreWithProfile')}
            {' '}
            <Link to="/register?edit">
              {t('profile.continue')}<span aria-hidden="true"> →</span>
            </Link>
          </p>
        )}
      </section>

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
           * show them. */
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

      {matches.length > 0 && (
        <>
          <div className="match-filters">
            <div className="match-tabs" role="tablist" aria-label={t('match.filterLabel')}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  className={filter === f.key ? 'match-tab is-on' : 'match-tab'}
                  onClick={() => setFilter(f.key)}
                >
                  {t(f.label)}
                  <span className="match-tab-n">{counts[f.key]}</span>
                </button>
              ))}
            </div>

            {/* The directory, beside the filters rather than above the list.
                For a signed-in student /scholarships is this page with the
                answer taken out, so it is not a place they move between — it is
                the escape hatch for "show me the ones you did not match". */}
            <Link className="match-browse" to="/scholarships">
              {t('home.browseAll')}<span aria-hidden="true"> →</span>
            </Link>
          </div>

          {shown.length === 0 ? (
            <p className="muted match-empty-filter">{t('match.filterEmpty')}</p>
          ) : (
            <ul role="list" className="match-list">
              {shown.map(m => (
                <li key={m.scholarship_id}><ScholarshipRow match={m} /></li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function Figure({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <li className={`match-figure tone-${tone}`}>
      <span className="match-figure-n">{n}</span>
      <span className="match-figure-label">{label}</span>
    </li>
  )
}

/* One scheme, as a row.
 *
 * Four columns, and each answers one of the questions a student opens this page
 * with. The grid is declared once in CSS rather than per column here, so the
 * columns line up between rows — which is the whole reason this is a row and
 * not a card.
 */
function ScholarshipRow({ match }: { match: Match }) {
  const { t } = useI18n()

  /* Where this row's Apply goes.
   *
   * The card this replaced had no such test at first: it drew `/apply/:id` for
   * every scheme the student was eligible for, including the ones applied for
   * on a sponsor's own site — and for those the press landed on the internal
   * Apply screen, which answers with a panel saying no application can be made
   * here. lib/apply.ts is the only copy of the test now, shared with the
   * directory, so the same scheme cannot behave differently depending on which
   * screen the student found it on. */
  const route = applyRoute(match)
  const deadline = deadlineLabel(t, match.days_remaining)
  const eligible = canApply(match.state)

  /* The one sentence explaining the state, in the state's own words.
   *
   * Taken from the engine rather than written here: `failures` is why a hard
   * rule refused, `missing` is what BLOCKED wants fetched, `unverified` is the
   * gap between "you said" and "somebody checked". Showing the first of
   * whichever applies is the disclosure the four-state design promises — a
   * state without its reason is just a colour. */
  const reason = firstReason(match)

  /* The note about an off-site scheme, in the column with room for it.
   *
   * It lived in the action column, where at 13rem it wrapped to four lines and
   * set the height of the entire row — leaving the scheme's own column, the
   * widest one, three-quarters empty. It is a fact about the scheme rather than
   * about the button, so it reads correctly here and costs nothing. */
  const note = eligible && !match.already_applied && route.kind === 'external'
    ? t(externalHelpKey(route), { org: match.organisation_name })
    : undefined

  return (
    <article className={`match-row ${stateClass(match.state)}`}>
      {/* 1. Do I qualify? */}
      <div className="match-col match-col-state">
        <span className={`state-badge ${stateClass(match.state)}`}>
          <span aria-hidden="true">{stateMark(match.state)}</span>
          {t(stateLabelKey(match.state))}
        </span>
      </div>

      {/* 2. What is it, and 3. how much? */}
      <div className="match-col match-col-say">
        <h2>
          {/* The title is the link, and the only one in this column: a row with
              four interactive regions is four things a keyboard user tabs
              through to reach the one that acts. */}
          <Link to={`/scholarships/${match.slug}`}>{match.title}</Link>
        </h2>
        <p className="match-org">
          <span className="match-award">
            {awardLabel(t, match.award_amount, match.benefit_summary)}
          </span>
          {' · '}
          {match.organisation_name}
        </p>
        {(reason ?? note) && <p className="match-reason">{reason ?? note}</p>}
      </div>

      {/* 4. When does it close, and where do I apply? */}
      <ul role="list" className="match-col match-col-facts">
        <li className={`match-fact deadline-${deadline.state}`}>
          <span aria-hidden="true" className="match-fact-mark">{deadline.mark || '·'}</span>
          {deadline.text}
        </li>
        <li className="match-fact">
          <span aria-hidden="true" className="match-fact-mark">{route.kind === 'external' ? '↗' : '⤵'}</span>
          {route.kind === 'external' ? t('match.applyAway') : t('match.applyHere')}
        </li>
      </ul>

      {/* 6. Where do I apply — the one action. */}
      <div className="match-col match-col-do">
        {match.already_applied ? (
          <Link className="btn" to={`/applications/${match.application_id}`}>
            {t('match.applied')}
          </Link>
        ) : !eligible ? (
          match.state === 'BLOCKED' ? (
            <>
              {/* The block is a document or a value, so the vault is where it
                  is cleared. next_action names the specific one. */}
              {match.next_action && <p className="match-do-say">{match.next_action}</p>}
              <Link className="btn primary" to="/documents">{t('nav.documents')}</Link>
            </>
          ) : (
            /* No Apply button on a scheme that would refuse one. The row still
               links to the scheme through its title, which is where somebody
               checking next year's rules goes. */
            <p className="match-do-say">{t('match.notOpenToYou')}</p>
          )
        ) : route.kind === 'external' ? (
          <>
            <p className="match-do-say">{t('match.youQualify')}</p>
            {/* An anchor, and labelled as leaving. noopener/noreferrer, and the
                new tab announced rather than left to the arrow. */}
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
          </>
        ) : (
          <>
            <p className="match-do-say">{t('match.youQualify')}</p>
            <Link className="btn primary" to={route.to}>{t('match.apply')}</Link>
          </>
        )}
      </div>
    </article>
  )
}

/* The first reason the engine gave, whichever kind applies to this state.
 *
 * One, not all of them. A scheme that fails four rules is still one answer to
 * "why not", and a row carrying four sentences stops being a row. */
function firstReason(match: Match): string | undefined {
  const pick = (rs?: Reason[]) => rs?.[0]?.message
  switch (match.state) {
    case 'NOT_ELIGIBLE': return pick(match.failures)
    case 'BLOCKED': return pick(match.missing)
    case 'LIKELY_ELIGIBLE': return pick(match.unverified)
    default: return undefined
  }
}
