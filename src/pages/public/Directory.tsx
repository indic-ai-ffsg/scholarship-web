import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useDebounced, useQuery } from '../../lib/hooks'
import { useI18n } from '../../lib/i18n-context'
import { disabilityChoices, qualificationChoices, stateChoices, type Choice } from '../../lib/fields'
import { awardLabel, shortDate } from '../../lib/format'
import { Deadline, Empty, ErrorState, Field, Loading, Notice } from '../../components/ui'
import type { Facet, Listing } from '../../lib/types'

/* The public directory (FR-17).
 *
 * Table 4.1: "determine whether help exists" — plain language, large type, no
 * authentication wall, multilingual. Somebody should be able to arrive here
 * from a printed notice, see in thirty seconds whether anything applies to
 * them, and only then be asked for an account.
 *
 * So the results are the page. Filters are secondary, the call to register
 * comes after the answer rather than before it, and nothing here requires a
 * session.
 */
export default function Directory() {
  const { t } = useI18n()
  const { status } = useAuth()

  /* Filters live in the URL rather than in component state.
   *
   * Not for tidiness: a filtered directory is the thing people send each other.
   * A counsellor forwards "here are the three post-matric schemes open in
   * Bihar" to a student, and that only works if the address carries the
   * filters. It also gives the back button the behaviour everybody expects —
   * undo my last filter — for free. */
  const [params, setParams] = useSearchParams()

  const term = params.get('q') ?? ''
  const disability = params.get('disability_type') ?? ''
  const course = params.get('course_level') ?? ''
  const state = params.get('state_code') ?? ''
  const orgType = params.get('org_type') ?? ''

  const search = useDebounced(term, 350)

  /** Empties every filter at once, back to the whole list. */
  function clearAll() {
    setParams(new URLSearchParams(), { replace: true })
  }

  /** Sets or clears one filter, leaving the others alone. */
  function setFilter(key: string, value: string) {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      // replace, so typing a search term does not fill the history with one
      // entry per keystroke and make the back button useless.
      return next
    }, { replace: true })
  }

  const query = useQuery<{ listings: Listing[]; facets: Record<string, Facet[]> }>(
    signal => api.get('/public/scholarships', {
      q: search,
      disability_type: disability,
      course_level: course,
      state_code: state,
      org_type: orgType,
      sort: 'closing',
      page_size: 50,
    }, signal),
    [search, disability, course, state, orgType],
  )

  const facets = query.data?.facets ?? {}
  const listings = query.data?.listings ?? []

  /* Whether anything is narrowing the list.
   *
   * It decides two things. It always decided whether to offer a way back out of
   * a filtered list; it now also decides WHICH empty state the results column
   * shows — "nothing matches those filters" against "nothing is listed here
   * yet" — which the page used to get wrong by assuming the first
   * unconditionally, and so told a reader with no filters set to remove one.
   *
   * Read from the URL rather than from form state, because the URL is the
   * state: a link a counsellor forwarded arrives filtered with no keystroke
   * behind it, and that reader needs the advice as much as anyone who typed it. */
  const narrowed = Boolean(term || disability || course || state || orgType)

  /* The count, and whether there is one to show.
   *
   * `total` is the server's, which is the number of matches rather than the
   * number on this page — the two differ at the page size and the smaller one
   * would understate the list. */
  const total = query.meta?.total

  /* Hide the filters only when the directory itself is empty.
   *
   * Not "when there are no results": a filtered search that found nothing needs
   * its filters on screen more than ever. `!narrowed` is what separates the
   * two, and `total === 0` rather than listings.length so a page of results
   * still loading does not blink the panel away and back. */
  const hideFilters = !narrowed && total === 0 && !query.stale

  return (
    <div className="page">
      <h1>{t('public.title')}</h1>
      <p className="lede">{t('public.lede')}</p>

      {/* Filters beside the results, not stacked above them.
        *
        * As a band across the top they were four controls in the left third of
        * a wide screen with the rest empty, and they scrolled away the moment
        * the results started — so narrowing a list of forty meant scrolling
        * back up for every change. Beside the list they stay put, and the width
        * that was empty is now doing something.
        *
        * On a narrow screen it collapses to one column with the filters first:
        * they are the control for what follows, and reading order has to say so
        * whatever the screen is. */}
      {/* `one-col` when there is nothing to filter.
        *
        * The panel is four controls whose only power is to narrow, and an empty
        * directory cannot be narrowed. Rendered anyway it was the largest thing
        * on the page — a tall card of dropdowns beside a column saying there
        * was nothing — which reads as a search tool that has broken rather than
        * as a directory waiting to be filled.
        *
        * Only when nothing is narrowing it. A filtered search that found
        * nothing MUST keep its filters on screen: they are the reason for the
        * result and taking them away would leave the reader unable to see, let
        * alone undo, what they had asked for. */}
      <div className={`directory${hideFilters ? ' one-col' : ''}`}>
        {!hideFilters && (
        <aside className="directory-filters">
          <div className="card">
            <div className="filter-head">
              <h2>{t('public.filters')}</h2>
              {/* Offered only when there is something to clear. A permanent
                  "clear" on an unfiltered list is a control that does nothing,
                  and this audience should not have to press one to find out. */}
              {narrowed && (
                <button className="quiet sm" onClick={clearAll}>{t('public.clear')}</button>
              )}
            </div>

            {/* Wrapped so the layout can give it the full width of the panel
                when the selects sit two to a row. A search box the width of a
                dropdown is a search box nobody can read their own typing in.

                No "(optional)" on any of these, either: the marker earns its
                place on a form where some fields are required, and on a filter
                panel it is four repetitions of something no reader was
                wondering. */}
            <div className="filter-search">
              <Field label={t('public.search')} optional={false}>
                {props => (
                  <input
                    {...props}
                    type="search"
                    value={term}
                    onChange={e => setFilter('q', e.target.value)}
                    autoComplete="off"
                  />
                )}
              </Field>
            </div>

            {/* The three that come from the vocabulary rather than from the
                results.
                *
                * These used to be facet-driven and vanished when the facet was
                * empty — which, for disability type, was nearly always: a
                * scheme open to every type contributes no facet row, and most
                * are. So a scholarship site for disabled students showed no
                * way to filter by disability, and a student in Haryana had no
                * way to say so.
                *
                * They are safe to show now because the query behind them means
                * "open to me" rather than "names me": a scheme that names no
                * disability type, no level or no state is open to all of them
                * and stays in the results. Without that fix these controls
                * would quietly hide the majority of the list. */}
            <VocabSelect
              label={t('public.filter.disability')}
              options={disabilityChoices()}
              anyLabel={t('public.filter.anyDisability')}
              value={disability}
              onChange={v => setFilter('disability_type', v)}
            />
            {/* "Qualification", not "What you study".
                *
                * The question is what the student has reached, which is what a
                * scheme restricts on — and the old label read as "what subject",
                * which is a different question this platform does not ask. The
                * values are unchanged, so an existing bookmark carrying
                * ?course_level=UNDERGRADUATE still works. */}
            <VocabSelect
              label={t('public.filter.qualification')}
              options={qualificationChoices()}
              anyLabel={t('public.filter.anyQualification')}
              value={course}
              onChange={v => setFilter('course_level', v)}
            />
            <VocabSelect
              label={t('public.filter.state')}
              options={stateChoices()}
              anyLabel={t('public.filter.allStates')}
              value={state}
              onChange={v => setFilter('state_code', v)}
            />
            <FacetSelect
              label={t('public.filter.provider')}
              options={facets.org_type}
              value={orgType}
              onChange={v => setFilter('org_type', v)}
            />
          </div>
        </aside>
        )}

        <div className="directory-results">
      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && (
        // The previous results stay up while the next search runs, under a
        // progress bar and inert. Emptying the list on every keystroke tells
        // somebody who arrived here to find out whether help exists that there
        // is none — repeatedly, while they are still typing.
        <div
          className={query.stale ? 'refetching' : undefined}
          aria-busy={query.stale || undefined}
        >
          {/* aria-live so a screen-reader user hears the count change when they
              adjust a filter, rather than having to go looking for it. Held
              back while a search is in flight: announcing the previous count
              as though it were the new one is worse than announcing nothing. */}
          {/* Suppressed at zero, because the empty state below says it in
              words. "0 scholarships open now" above "No scholarships are listed
              here yet" is the same news twice, and the first version of it is
              the one that reads as a number nobody wanted. */}
          <p className="result-count" role="status" aria-live="polite">
            {query.stale
              ? t('public.searching')
              : total === 0
                ? '\u00a0'
                : `${total ?? listings.length} ${t('public.results')}`}
          </p>

          {listings.length === 0 && !query.stale ? (
            /* Which of the two is a question about the filters, not the count.
             *
             * This said "No scholarships match those filters. Try removing a
             * filter" whether or not one was set \u2014 so on an empty directory it
             * told the reader to undo something they had not done, and pointed
             * them at three selects all reading "Any". The page was blaming
             * them for its own emptiness.
             *
             * Filtered, the advice is right and now comes with the button that
             * takes it: clearing four controls by hand is the work the reader
             * was being asked to do, and clearAll already existed unused. */
            narrowed ? (
              <Empty
                title={t('public.none')}
                hint={t('public.none.hint')}
                action={
                  <button className="btn" onClick={clearAll}>
                    {t('public.none.clear')}
                  </button>
                }
              />
            ) : (
              <Empty title={t('public.empty')} hint={t('public.empty.hint')} />
            )
          ) : (
            <ul role="list" className="listing-list">
              {listings.map(l => (
                <li key={l.scholarship_id}>
                  <ListingCard listing={l} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The offer at the end of a directory page is no longer "create an
          account". Somebody who has just read forty summaries and cannot tell
          which apply to them is one question short of an answer, not one form
          short of one — so this leads to the check, which needs nothing. */}
      {status !== 'authenticated' && listings.length > 0 && (
        <Notice tone="info" title={t('public.cta')}>
          <p>{t('public.ctaHelp')}</p>
          <Link className="btn primary" to="/register">{t('public.cta')}</Link>
        </Notice>
      )}
        </div>
      </div>
    </div>
  )
}

/* A filter whose options are the whole vocabulary, not the current results.
 *
 * The difference from FacetSelect below is what happens when nothing in the
 * list matches: a facet-driven control disappears, and a vocabulary-driven one
 * still offers every answer a student might have. For "what is your
 * disability" and "which state do you live in" the second is the only sensible
 * behaviour — the answer is a property of the student, not of the result set,
 * and a control that vanishes because today's list is short is a control
 * nobody can rely on. */
function VocabSelect({
  label, options, anyLabel, value, onChange,
}: {
  label: string
  options: Choice[]
  anyLabel: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label} optional={false}>
      {props => (
        <select {...props} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">{anyLabel}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  )
}

function FacetSelect({
  label, options, value, onChange,
}: {
  label: string
  options?: Facet[]
  value: string
  onChange: (v: string) => void
}) {
  const { t } = useI18n()

  /* A facet with nothing in it is not rendered at all.
   *
   * The disability filter is the case that matters: facets are built from a
   * scheme's own eligibility rules, and a scheme open to every disability type
   * — which most are, since they filter on percentage rather than on type —
   * contributes no rows. The control was therefore permanently empty, and an
   * empty "Disability" filter on a scholarship site for disabled students
   * reads as "we found nothing for you", which is the opposite of the truth. */
  if (!options?.length) return null

  return (
    <Field label={label} optional={false}>
      {props => (
        <select {...props} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">{t('public.filter.any')}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label} ({o.count})
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

/* How many rules are shown before the row is folded.
 *
 * Two, because the row has to stay a row. The point of the full width is that
 * the eligibility is on the page at all; the point of the fold is that forty
 * schemes still fit on a screen somebody can scan. Most schemes state three or
 * four rules and the first two are almost always the two that decide it — the
 * disability and the level of study — so two lines answer "is this me?" for
 * the majority and the rest is one press away without leaving the list. */
const CRITERIA_SHOWN = 2

/* One scheme, as a full-width row.
 *
 * This was a 20rem card in an auto-fit grid: three to a row on a desktop, which
 * is the shape a shop uses for products and the wrong one for a rule set. A
 * third of the page fits a title, a figure and a date — so the two things that
 * actually decide whether a scheme is worth opening, who it is for and what it
 * pays, were both on the other page. Forty schemes meant forty round trips to
 * find the two that applied.
 *
 * One row each, and the width buys the eligibility. Three parts:
 *
 *   the head    the name and who is offering it, on its own band
 *   the facts   eligibility with the closing date beside it, then the benefit
 *   the rail    the two things there are to do, stacked and equal width
 *
 * The rail is a column rather than a row of buttons under the text because
 * down a list of forty the two controls then land in the same place on every
 * row — one target to aim at repeatedly rather than one that moves with the
 * length of the summary above it. That matters here more than most places: the
 * audience includes people with a tremor driving a phone one-handed.
 *
 * It folds on a container query, not a media query. This component is also
 * rendered in the partner page's narrow aside, where the window is wide and
 * the card is not, and a media query would give that column a two-column row
 * eleven characters across.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useI18n()

  /* Folded by default, and expanded in place rather than by leaving.
   *
   * "Read more" that navigates is the same link as "View details" wearing a
   * different word, and a reader comparing four schemes should not have to
   * lose the list to finish reading one of them. */
  const [expanded, setExpanded] = useState(false)

  /* Deduplicated, for the reason the scheme page gives at more length: two
   * rules that render to the same sentence are one thing to read, and printed
   * twice they read as a broken page rather than as two rules that agree. */
  const criteria = [...new Set(listing.criteria ?? [])]
  const foldable = criteria.length > CRITERIA_SHOWN
  const shown = expanded ? criteria : criteria.slice(0, CRITERIA_SHOWN)

  /* The sponsor's own page, when this is a scheme the platform only lists.
   *
   * Both halves matter, and the scheme page carries the long version of why: a
   * TENANT scheme may also have an external_url, and for one of those the
   * application still belongs here. The kind decides; the URL only supplies the
   * address. `?? 'TENANT'` because a cached response predating the field has
   * none, and TENANT is the column's own default — falling back the other way
   * would send every reader off-site on one stale response. */
  const external =
    (listing.listing_kind ?? 'TENANT') === 'CURATED' && listing.external_url
      ? listing.external_url
      : null

  /* Closed, by the same test the deadline badge uses (format.deadlineLabel).
   * An Apply button on a scheme that shut last week is an invitation to spend
   * twenty minutes on an application nobody can receive. */
  const closed = listing.days_remaining !== undefined && listing.days_remaining < 0

  const detail = `/scholarships/${listing.slug}`
  const id = `listing-${listing.scholarship_id}`

  /* Appended to the accessible name of every control in the row.
   *
   * Visually "View details" is unambiguous — it is inside a box with the
   * scheme's name at the top of it. In a screen reader's list of links it is
   * forty identical entries reading "View details", which is the same page
   * offering no way to choose. The scheme's name is what tells them apart, and
   * it costs a sighted reader nothing. */
  const forThis = <span className="sr-only"> — {listing.title}</span>

  return (
    <article className="listing" aria-labelledby={`${id}-title`}>
      <div className="listing-head">
        <h2 className="listing-title" id={`${id}-title`}>
          <Link to={detail}>{listing.title}</Link>
        </h2>
        <p className="listing-org">
          {t('public.offeredBy')} <strong>{listing.organisation_name}</strong>
        </p>
      </div>

      <div className="listing-body">
        <div className="listing-facts">
          <section className="listing-fact" aria-labelledby={`${id}-elig`}>
            {/* The label and the deadline share a line: they are the two things
                the eye lands on first, and the date has nowhere better to be
                than the end of the line that starts "Eligibility". */}
            <div className="listing-fact-head">
              <h3 className="listing-label" id={`${id}-elig`}>{t('public.eligibility')}</h3>
              {/* The exact date goes to a screen reader, when there is one.
                  "Closing soon" is the scannable version and the date is the
                  useful one; omitted rather than announced as an empty string
                  when the scheme has no window. */}
              <Deadline days={listing.days_remaining}>
                {listing.closes_at && (
                  <span className="sr-only"> — {shortDate(listing.closes_at)}</span>
                )}
              </Deadline>
            </div>

            {/* The summary is the fallback, not a companion.
                *
                * A scheme with criteria has something better than prose in this
                * slot: the rules themselves, which is what the reader is
                * measuring themselves against. A scheme with none — the API
                * omits the array when the rule set is empty — would otherwise
                * show a bare heading, so its own sentence stands in. */}
            {shown.length > 0 ? (
              <ul role="list" className="criteria" id={`${id}-elig-list`}>
                {shown.map((c, i) => (
                  <li key={i}>
                    <span className="mark" aria-hidden="true">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="listing-summary">{listing.summary}</p>
            )}

            {foldable && (
              <button
                type="button"
                className="quiet listing-more"
                aria-expanded={expanded}
                aria-controls={`${id}-elig-list`}
                onClick={() => setExpanded(v => !v)}
              >
                {expanded ? t('public.readLess') : t('public.readMore')}
                {forThis}
              </button>
            )}
          </section>

          <section className="listing-fact" aria-labelledby={`${id}-benefit`}>
            <h3 className="listing-label" id={`${id}-benefit`}>{t('public.benefits')}</h3>
            <p className="amount">
              {awardLabel(t, listing.award_amount, listing.benefit_summary)}
            </p>
            {listing.is_renewable && (
              <p className="listing-renew muted">{t('public.renewable')}</p>
            )}
          </section>
        </div>

        <div className="listing-actions">
          <Link className="btn" to={detail}>
            {t('public.viewDetails')}{forThis}
          </Link>

          {/* Apply, and where it goes.
            *
            * Nothing here branches on the session, and that is deliberate. The
            * directory is a public page whose first paint happens before
            * /auth/refresh answers, so a control that reads the session picks
            * one destination, draws it under the reader's finger, and swaps it
            * for another a moment later. /apply carries the guard already:
            * RequireProfile sends a visitor to register or sign in and hands
            * them back here afterwards.
            *
            * A CURATED scheme is the exception, and it is a property of the
            * scheme rather than of the reader — the platform lists it, somebody
            * else runs it, and a database trigger (backend 0026) refuses any
            * application row against it. */}
          {closed ? (
            <p className="listing-closed">{t('public.closedNote')}</p>
          ) : external ? (
            /* A real anchor, not a Link: this leaves the site. noopener denies
               the opened page a handle on this one, noreferrer keeps our URL
               out of their logs, and the new tab is announced rather than
               implied by the arrow — an unannounced new tab is one of the most
               disorienting things a screen reader user meets. */
            <a
              className="btn primary"
              href={external}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('public.applyNow')}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> — {listing.title} ({t('common.newTab')})</span>
            </a>
          ) : (
            <Link className="btn primary" to={`/apply/${listing.scholarship_id}`}>
              {t('public.applyNow')}{forThis}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
