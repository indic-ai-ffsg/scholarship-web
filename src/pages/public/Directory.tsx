import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useDebounced, useQuery } from '../../lib/hooks'
import { withNext } from '../../lib/next'
import { useI18n } from '../../lib/i18n-context'
import {
  disabilityChoices, genderFilterChoices, qualificationChoices, stateChoices, subjectChoices, type Choice,
} from '../../lib/fields'
import { applyRoute } from '../../lib/apply'
import { awardLabel, shortDate } from '../../lib/format'
import { Deadline, Empty, ErrorState, Field, Loading, Notice, SponsorLogo } from '../../components/ui'
import { SchemeSheet } from './SchemeSheet'
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
  /* /scholarships/<slug> renders this page with the panel already open.
   *
   * The scheme used to be a page of its own. It is the panel now, at both
   * addresses: the row opens ?scheme=, and a link somebody was sent opens the
   * path — the same component either way, so a forwarded link and a pressed row
   * give the reader the same thing, which they did not before.
   *
   * The path is kept rather than redirected to ?scheme= because it is the
   * address already in circulation: in counsellors' messages, in search
   * results, and in every "copy link address" taken off a row. */
  const { slug: pathSlug } = useParams()
  const navigate = useNavigate()

  const term = params.get('q') ?? ''
  const disability = params.get('disability_type') ?? ''
  const course = params.get('course_level') ?? ''
  const state = params.get('state_code') ?? ''
  const orgType = params.get('org_type') ?? ''
  const gender = params.get('gender') ?? ''
  const subject = params.get('tags') ?? ''
  const overseas = params.get('overseas') ?? ''

  const search = useDebounced(term, 350)

  /* Which scheme is open in the panel, if any.
   *
   * In the address, like the filters, and for the same reason plus one more.
   * The filters are in the URL because a filtered directory is the thing people
   * forward; a scheme panel is in it because the back button has to close the
   * panel. A reader who opens four schemes and presses Back expects the last
   * one to shut, not to be thrown out of the directory entirely — and on
   * Android that is the hardware button, so getting it wrong empties the screen
   * they were working in.
   *
   * `?scheme=` rather than reusing the /scholarships/<slug> path: the row and
   * the panel are the same page with something open on top of it, and swapping
   * the path would make it a different page that happens to look like this one.
   * The full page still exists at that address for anyone who arrives there. */
  const openSlug = pathSlug ?? params.get('scheme')

  /** Opens the panel on one scheme, as a new history entry. */
  function openScheme(slug: string) {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('scheme', slug)
      return next
    })
    // pushed, not replaced: this is the entry Back has to come back to.
  }

  /** Shuts the panel, leaving every filter as it was. */
  function closeScheme() {
    /* Two ways in, so two ways out.
     *
     * Arrived at /scholarships/<slug>, the panel is named by the path and
     * deleting a query parameter would close nothing — the sheet would shut
     * itself and React would immediately reopen it from the path. So that case
     * navigates to the list, carrying the filters across.
     *
     * Both replace rather than push, so closing does not leave a "directory
     * with nothing open" entry between the panel and where the reader came
     * from. Back from a closed panel goes back to the list they arrived at, and
     * Back from an OPEN one closes it — the browser undoing openScheme's push,
     * not this. */
    if (pathSlug) {
      const rest = new URLSearchParams(params)
      rest.delete('scheme')
      const qs = rest.toString()
      navigate(`/scholarships${qs ? `?${qs}` : ''}`, { replace: true })
      return
    }
    setParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('scheme')
      return next
    }, { replace: true })
  }

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
      gender,
      tags: subject,
      overseas,
      sort: 'closing',
      page_size: 50,
    }, signal),
    [search, disability, course, state, orgType, gender, subject, overseas],
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
  const narrowed = Boolean(term || disability || course || state || orgType
    || gender || subject || overseas)

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
            {/* Where, before which state: a student going abroad has no state
                to give, and asking the narrower question first sends them
                looking for an answer the next control makes irrelevant. */}
            <Field label={t('public.filter.where')} optional={false}>
              {props => (
                <select
                  {...props}
                  value={overseas}
                  onChange={e => setFilter('overseas', e.target.value)}
                >
                  <option value="">{t('public.filter.anyWhere')}</option>
                  <option value="india">{t('public.filter.inIndia')}</option>
                  <option value="abroad">{t('public.filter.abroad')}</option>
                </select>
              )}
            </Field>

            <VocabSelect
              label={t('public.filter.state')}
              options={stateChoices()}
              anyLabel={t('public.filter.allStates')}
              value={state}
              onChange={v => setFilter('state_code', v)}
            />

            <VocabSelect
              label={t('public.filter.gender')}
              options={genderFilterChoices()}
              anyLabel={t('public.filter.anyGender')}
              value={gender}
              onChange={v => setFilter('gender', v)}
            />

            {/* Course, and the one control here that means "names this" rather
                than "is open to this". A subject tag is a claim the listing
                makes about itself, so an untagged scheme is not silently
                treated as covering every subject — see the Tags note in
                publicdir. */}
            <VocabSelect
              label={t('public.filter.course')}
              options={subjectChoices()}
              anyLabel={t('public.filter.anyCourse')}
              value={subject}
              onChange={v => setFilter('tags', v)}
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
                  <ListingCard listing={l} onOpen={() => openScheme(l.slug)} />
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

      {/* Outside .directory, because a modal dialog is in the browser's top
          layer and belongs to the page rather than to the results column.
          Keyed on the slug so pressing a second row while the first is open
          rebuilds the panel — without it, React keeps the mounted component
          and the detail request for the new scheme lands in the old one. */}
      {openSlug && (
        <SchemeSheet
          key={openSlug}
          slug={openSlug}
          seed={listings.find(l => l.slug === openSlug)}
          onClose={closeScheme}
        />
      )}
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
 * disability and the level of study — so two sentences answer "is this me?"
 * for the majority and the rest is one press away without leaving the list. */
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
export function ListingCard({
  listing, onOpen,
}: {
  listing: Listing
  /* Opens the scheme in a panel over the list. Optional, and the fallback is
   * the point: without it every control here is an ordinary link to
   * /scholarships/<slug>, which is what the partner page — one card, no list to
   * stay in — should get. */
  onOpen?: () => void
}) {
  const { t } = useI18n()
  const { status } = useAuth()

  /* Turns a link into a press on the panel, but only when it really is one.
   *
   * Every control below stays a real <a href> pointing at the full page, and
   * this intercepts the plain left click. That is not politeness about
   * progressive enhancement, it is the four behaviours a reader already has and
   * would otherwise lose: cmd- or ctrl-click to open the scheme in a background
   * tab while keeping their place, middle-click for the same, "copy link
   * address" from the context menu, and the status bar showing where a control
   * goes before it is pressed. A <button> has none of them.
   *
   * defaultPrevented, because a handler further in may already have decided. */
  function intercept(e: React.MouseEvent) {
    if (!onOpen) return
    if (e.defaultPrevented || e.button !== 0) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onOpen()
  }

  /* Deduplicated, for the reason the scheme page gives at more length: two
   * rules that render to the same sentence are one thing to read, and printed
   * twice they read as a broken page rather than as two rules that agree. */
  const criteria = [...new Set(listing.criteria ?? [])]
  const foldable = criteria.length > CRITERIA_SHOWN
  const shown = criteria.slice(0, CRITERIA_SHOWN)

  /* Where Apply goes, decided in one place for all four buttons.
   *
   * This used to read `listing_kind === 'CURATED' && external_url` here, and
   * again in the scheme panel, and again on the scheme page, and not at all in
   * the matched list. lib/apply.ts holds the test now, along with the reason
   * the field is apply_mode rather than the kind and the reason the fallbacks
   * lean towards internal. */
  const route = applyRoute(listing)

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
        {/* The mark leads the band, before the name, and only when there is
            one — see SponsorLogo, which draws nothing rather than a grey box.
            Its absence closes the gap instead of leaving a hole, so a row
            without a logo is a row rather than a row missing something. */}
        <SponsorLogo listing={listing} />
        <div className="listing-head-text">
          <h2 className="listing-title" id={`${id}-title`}>
            <Link to={detail} onClick={intercept}>{listing.title}</Link>
          </h2>
          <p className="listing-org">
            {t('public.offeredBy')} <strong>{listing.organisation_name}</strong>
          </p>
        </div>
      </div>

      <div className="listing-body">
        <div className="listing-facts">
          {/* Only when there are rules to show. The lead-in used to fall back
              to listing.summary, which is the "About this scholarship" prose —
              so a scheme with no criteria printed its description under a
              heading reading "To be eligible", labelling a paragraph about the
              scheme as the conditions a reader has to meet. That is the one
              thing this row must not get wrong, and it was worse than the
              empty lead-in the fallback existed to avoid: an absent section
              says nothing, a mislabelled one says something false. */}
          {shown.length > 0 && (
          <section className="listing-fact" aria-labelledby={`${id}-elig`}>
            <h3 className="listing-label" id={`${id}-elig`}>{t('public.eligibility')}</h3>

            {/* Prose on the row, a checklist in the panel.
                *
                * These were ticked list items here too, and a tick is a claim:
                * everywhere else on this site it means "you meet this" — the
                * scheme page's criteria, the match states, the chip selector.
                * On a directory row it was in front of rules about a reader the
                * page knows nothing about, ticking conditions nobody had
                * checked. The panel keeps the checklist, where the whole rule
                * set is present and the reader is going through it.
                *
                * Joined into a sentence rather than stacked, because they
                * already are sentences — see the note on public.eligibility —
                * and two of them under a lead-in reads as a paragraph somebody
                * wrote. As list items they read as a form. */}
            <p className="listing-elig">{shown.join(' ')}</p>

            {/* Offered only when the rules are actually cut off. "Read more"
                under a rule set that is already complete promises the panel has
                something the row does not. */}
            {foldable && (
              <Link className="listing-more" to={detail} onClick={intercept}>
                {t('public.readMore')}
                {/* aria-hidden: "right arrow" read after every one of forty
                    "Read more" links is noise. It is the visual half of the
                    pair — see the note on .listing-more. */}
                <span className="go" aria-hidden="true">→</span>
                <span className="sr-only"> — {listing.title}</span>
              </Link>
            )}
          </section>
          )}

          {/* The deadline moved out of this line on 2026-09-10, to the action
              column. It was here rather than against "To be eligible" because
              sharing that line read as a condition of qualifying — "To be
              eligible: closes in 12 days" — and beside the award it was at
              least a fact next to a fact.
              *
              * What the move buys is that the deadline now sits with the thing
              * it governs. "Closes in 12 days" is not a property of the money,
              * it is the answer to "have I still got time to press this", and
              * the button is what it qualifies. */}
          <section className="listing-fact" aria-labelledby={`${id}-benefit`}>
            <div className="listing-fact-head">
              <h3 className="listing-label" id={`${id}-benefit`}>{t('public.benefits')}</h3>
            </div>
            <p className="amount">
              {awardLabel(t, listing.award_amount, listing.benefit_summary,
                listing.award_amount_min, listing.award_amount_max)}
            </p>
            {listing.is_renewable && (
              <p className="listing-renew muted">{t('public.renewable')}</p>
            )}
          </section>
        </div>

        <div className="listing-actions">
          <Link className="btn" to={detail} onClick={intercept}>
            {t('public.viewDetails')}{forThis}
          </Link>

          {/* Apply, and where it goes.
            *
            * Four outcomes, and the order of the tests is the whole of it.
            *
            * CLOSED first, because it is a fact about the scheme and outranks
            * everything about the reader. An Apply button on a scheme that shut
            * last week is an invitation to spend an afternoon on an application
            * nobody can receive.
            *
            * THE SESSION second, and above the external test rather than below
            * it. Nothing on the public site hands a visitor an apply route
            * before they have an account — not even a CURATED scheme, whose
            * application this platform never receives and whose sponsor's form
            * would take them without one.
            *
            * That is a product decision and not an oversight, so here is the
            * argument for it. A visitor who leaves on an external link has been
            * given one scheme and nothing else: no profile, so no matching, and
            * no way to learn about the thirty other schemes they qualify for —
            * which is the entire thing this platform does that a search engine
            * does not. Registering costs them one form and produces the matched
            * list; the sponsor's link is still there afterwards, on the same
            * scheme, unchanged. The order of those two steps is what decides
            * whether somebody arriving from a printed notice leaves with one
            * scholarship or with all of the ones that apply to them.
            *
            * The cost is real and is worth naming: a curated scheme's
            * application is made on the sponsor's site whether or not the
            * student has an account here, so registering buys them the matched
            * list rather than a smoother application. public.applyExternalHelp
            * says as much once they get there.
            *
            * EXTERNAL third, deciding only between the two doors a signed-in
            * student can be sent through: the sponsor's own site for a scheme
            * we merely list, /apply for one we run.
            *
            * Nothing is drawn while `status` is 'loading'. The branches have
            * different destinations, so drawing one early puts a door under the
            * reader's finger and swaps it for another a moment later. The rail
            * is the shorter of the row's two columns in almost every case, so
            * the button arriving costs no reflow — and where it would, a moment
            * of one missing button is cheaper than a press that goes somewhere
            * unintended. */}
          {closed ? (
            <p className="listing-closed">{t('public.closedNote')}</p>
          ) : status === 'loading' ? null : status !== 'authenticated' ? (
            /* To the matches list, not back to this row.
             *
             * `next` could carry them to /apply for this scheme and lib/next.ts
             * was built to do exactly that. It is the wrong destination here.
             * Registering is what makes matching possible, and the screen that
             * shows what it bought them is the matched list: every open scheme
             * scored against the profile they have just filled in, this one
             * among them with a real verdict on it rather than the "who this is
             * for" they were reading a minute ago. Handing them straight back
             * to one application skips the answer they just paid for. */
            <Link className="btn primary" to={withNext('/register', '/matches')}>
              {t('public.registerToApply')}{forThis}
            </Link>
          ) : route.kind === 'external' ? (
            /* A real anchor, not a Link: this leaves the site. noopener denies
               the opened page a handle on this one, noreferrer keeps our URL
               out of their logs, and the new tab is announced rather than
               implied by the arrow — an unannounced new tab is one of the most
               disorienting things a screen reader user meets.

               The label names the destination now. It read public.applyNow,
               which is the same four characters the internal button uses, so a
               sighted reader had the arrow to go on and a screen reader user
               had nothing at all — two buttons with one accessible name doing
               materially different things. Colour and a glyph carrying that
               difference alone is the WCAG 1.4.1 failure the house rules put
               first, and here the thing being distinguished is whether an
               application reaches anybody. */
            /* The label and nothing else. applyExternalHelp is drawn in the
               panel and on the matched card, both of which have the width for
               a sentence; this rail is 11rem and does not.
               *
               * Measured rather than assumed, because the note was here first.
               * At 900px the two-column layout gives the rail 176px, and the
               * curated sentence — which has to name a sponsor like
               * "Department of Empowerment of Persons with Disabilities" — set
               * to nine lines, stretching the card to twice its height with an
               * empty column beside it. Down a list of forty that is not a
               * caption, it is the layout.
               *
               * Nothing is lost by leaving it out here. The button says the
               * application happens on their site, the band above says whose
               * site, and the panel one press away says what it means for
               * tracking. The rule the house style actually cares about is that
               * no single control carries the difference by colour or glyph
               * alone, and the label is what satisfies it. */
            <a
              className="btn primary"
              href={route.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('public.applyExternal')}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> — {listing.title} ({t('common.newTab')})</span>
            </a>
          ) : (
            <Link className="btn primary" to={route.to}>
              {t('public.applyNow')}{forThis}
            </Link>
          )}

          {/* Under the buttons, because it is the condition on pressing one.
              *
              * Last rather than first on purpose: read in order this column
              * says "here is what you can do, and here is how long you have"
              * — which is the sentence a reader is assembling anyway. Leading
              * with the deadline would put a countdown in front of the offer,
              * which is the shape of a sales page rather than of a directory.
              *
              * The exact date goes to a screen reader when there is one. The
              * countdown is the scannable version and the date is the useful
              * one; omitted rather than announced as an empty string when the
              * scheme has no window. */}
          <Deadline days={listing.days_remaining}>
            {listing.closes_at && (
              <span className="sr-only"> — {shortDate(listing.closes_at)}</span>
            )}
          </Deadline>
        </div>
      </div>
    </article>
  )
}
