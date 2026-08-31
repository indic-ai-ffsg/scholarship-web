import { Link, useSearchParams } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useDebounced, useQuery } from '../../lib/hooks'
import { useI18n } from '../../lib/i18n-context'
import { money, shortDate } from '../../lib/format'
import { Empty, ErrorState, Field, Loading, Notice } from '../../components/ui'
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

  // Whether anything is narrowing the list, which decides whether a way back
  // out of it is offered at all.
  const narrowed = Boolean(term || disability || course || state || orgType)

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
      <div className="directory">
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

            <FacetSelect
              label={t('public.filter.disability')}
              options={facets.disability_type}
              value={disability}
              onChange={v => setFilter('disability_type', v)}
            />
            <FacetSelect
              label={t('public.filter.course')}
              options={facets.course_level}
              value={course}
              onChange={v => setFilter('course_level', v)}
            />
            <FacetSelect
              label={t('public.filter.state')}
              options={facets.state_code}
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
          <p className="result-count" role="status" aria-live="polite">
            {query.stale ? '\u00a0' : `${query.meta?.total ?? listings.length} ${t('public.results')}`}
          </p>

          {listings.length === 0 && !query.stale ? (
            <Empty title={t('public.none')} hint={t('public.none.hint')} />
          ) : (
            <ul role="list" className="card-grid">
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
          <Link className="btn primary" to="/check">{t('check.go')}</Link>
        </Notice>
      )}
        </div>
      </div>
    </div>
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

export function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useI18n()
  const soon = listing.days_remaining <= 7

  return (
    <article className="card">
      <h2 style={{ fontSize: 'var(--step-1)' }}>
        <Link to={`/scholarships/${listing.slug}`}>{listing.title}</Link>
      </h2>

      <p>{listing.summary}</p>

      <div className="row" style={{ gap: '1.25rem' }}>
        <span className="amount">{money(listing.award_amount)}</span>
        <span className={`deadline ${soon ? 'soon' : ''}`}>
          {soon
            ? t('public.closingSoon')
            : t('public.closesIn', { n: listing.days_remaining })}
          <span className="sr-only"> — {shortDate(listing.closes_at)}</span>
        </span>
      </div>

      <p className="muted" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
        {t('public.offeredBy')} {listing.organisation_name}
      </p>
    </article>
  )
}
