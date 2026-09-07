import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useQuery } from '../../lib/hooks'
import { useI18n } from '../../lib/i18n-context'
import { count, money } from '../../lib/format'
import { Field } from '../../components/ui'
import Slides from '../../components/Slides'
import type { Facet, Listing } from '../../lib/types'

/* The landing page.
 *
 * For a great many visitors this is the only page they will read. Somebody
 * arrives from a printed notice on a college wall or a forwarded message, and
 * decides here whether any of this is worth creating an account for. Table 4.1
 * gives the public site one job — "determine whether help exists" — so the
 * page answers that before it asks for anything.
 *
 * Which decides the order. The band leads: its first panel is the proposition —
 * what this is, what it costs — and it is the one thing here that does not
 * depend on a request having succeeded. The hero follows, with the search box
 * above the explanation, because a visitor who already knows what they are
 * looking for should not have to read a pitch first. The count beside it is
 * real, from the same endpoint the directory uses, because "over 500
 * scholarships!" written into a template is the kind of claim that is wrong
 * within a month and that nobody notices. Schemes closing soonest come before
 * the ones that are merely available. And the invitation to register is at the
 * bottom, after the answer.
 *
 * There is one picture, drawn as flat vector shapes inside the bundle, and no
 * photograph of a smiling student. Every kilobyte here is paid for by somebody
 * on a metered connection, and a stock image of a person in a wheelchair is not
 * what this audience is short of.
 */
export default function Home() {
  const { t } = useI18n()
  const { status } = useAuth()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')

  const signedIn = status === 'authenticated'

  // Closing soonest, which is both the useful order and the honest one: a
  // scheme with four days left is the one a visitor most needs to see today.
  const query = useQuery<{ listings: Listing[]; facets: Record<string, Facet[]> }>(
    signal => api.get('/public/scholarships', {
      sort: 'closing', page_size: 6,
    }, signal),
    [],
  )

  const total = query.meta?.total
  const listings = query.data?.listings ?? []
  const facets = query.data?.facets ?? {}

  function search(e: FormEvent) {
    e.preventDefault()
    // Handed over in the URL rather than in state, so the directory can be
    // linked to, bookmarked and forwarded — which is how a counsellor sends a
    // student to something specific.
    navigate(term.trim() ? `/scholarships?q=${encodeURIComponent(term.trim())}` : '/scholarships')
  }

  return (
    <div className="page home">
      {/* First on the page.
          Its lead panel is the site's proposition, which is what a visitor who
          arrived from a forwarded message needs before anything else, and the
          announcements behind it are the perishable news — a camp on Saturday,
          a helpline shut for Diwali — which is no use to anybody four screens
          down. The page's h1 is the hero below; see the note on Lead() for why
          this band's heading stays at h2 despite coming first. */}
      <Slides />

      {/* Two columns where there is room for them.
        *
        * The hero was one column of text with the right half of a wide screen
        * empty beside it, and the schemes closing soonest were four screens
        * further down — past the explanation, which is the part a returning
        * visitor does not need. The deadline is the perishable thing on this
        * page, so it sits next to the pitch rather than under it. */}
      <section className="hero">
        <div className="hero-main">
        <h1>{t('home.title')}</h1>
        <p className="lede">{t('home.lede')}</p>

        {/* The two ways in, before the search rather than after it.
          *
          * They were below it, on the reasoning that a visitor who already
          * knows what they want should not have to read a pitch first. The
          * reasoning is sound and the position was still wrong, because of
          * where the fold falls: measured at 1280x800, the search box ended at
          * 775 and this row ran 834 to 883 — entirely off screen. So the
          * minority who arrive knowing what to search for were served above the
          * fold, and everybody else, who is here to find out whether any of
          * this applies to them, had no visible way forward at all.
          *
          * The search box is also labelled "(optional)", which settles it: an
          * optional control should not outrank the two primary ones. It is one
          * scroll-free glance away, directly underneath.
          *
          * This is the same test the band above was already shortened to pass —
          * see the note on .slides, which cut a full-screen hero for putting
          * "the search box, the live count and the schemes closing this week
          * below the fold". */}
        <div className="row">
          {/* The full sentence here, where there is room for it. The masthead
              and the footer use the shorter nav label. */}
          <Link className="btn primary" to="/check">{t('public.cta')}</Link>
          <Link className="btn" to="/scholarships">{t('home.browseAll')}</Link>
        </div>

        <form onSubmit={search} className="hero-search" role="search">
          <Field label={t('home.search')}>
            {props => (
              <input
                {...props}
                type="search"
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                autoComplete="off"
              />
            )}
          </Field>
          <button type="submit" className="primary">{t('home.searchGo')}</button>
        </form>

        {/* Rendered only once the number is known. A count that appears as
            "0 scholarships open right now" for half a second while the request
            is in flight is worse than nothing at all.
            *
            * Zero is not a small count, it is a different situation, and it
            * needs different words. "0 scholarships open right now" sat
            * directly under a headline promising every scholarship you are
            * eligible for, and under two buttons leading into an empty list —
            * the page contradicting itself in three places at once. This is
            * what production has actually been serving. */}
        {total === 0 ? (
          <p className="hero-meta hero-meta-empty">
            <strong>{t('home.openNone')}</strong>{' '}
            <span className="muted">{t('home.openNoneBody')}</span>
          </p>
        ) : (
          <p className="hero-meta">
            {typeof total === 'number' && (
              <strong>{count(total)} {t('home.openNow')}</strong>
            )}
            {' '}
            <span className="muted">{t('home.noAccount')}</span>
          </p>
        )}
        </div>

        {listings.length > 0 && (
          <aside className="hero-side" aria-labelledby="closing-soon">
            <div className="card">
              <h2 id="closing-soon">{t('home.closing')}</h2>
              <p className="muted small">{t('home.closingLede')}</p>

              {/* A compact list, not the full cards used in the directory: the
                  job here is "there is a deadline this week", and the summary
                  that helps somebody choose is one tap away on the scheme's own
                  page. */}
              <ul role="list" className="deadline-list">
                {listings.slice(0, 3).map(l => (
                  <li key={l.scholarship_id}>
                    <Link to={`/scholarships/${l.slug}`}>{l.title}</Link>
                    <p>
                      <span className="amount">{money(l.award_amount)}</span>
                      <span className={`deadline ${l.days_remaining <= 7 ? 'soon' : ''}`}>
                        {l.days_remaining <= 7
                          ? t('public.closingSoon')
                          : t('public.closesIn', { n: l.days_remaining })}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>

              <Link className="btn quiet" to="/scholarships">{t('home.browseAll')}</Link>
            </div>
          </aside>
        )}
      </section>

      {/* The anchor the masthead's "How it works" points at.
          *
          * scroll-margin-top in the stylesheet keeps the heading clear of the
          * sticky bar, which would otherwise land on top of it. */}
      <section className="home-section" id="how-it-works">
        <h2 tabIndex={-1}>{t('home.how')}</h2>
        <ol role="list" className="steps">
          <li>
            <h3>{t('home.step1')}</h3>
            <p>{t('home.step1Body')}</p>
          </li>
          <li>
            <h3>{t('home.step2')}</h3>
            <p>{t('home.step2Body')}</p>
          </li>
          <li>
            {/* The platform's actual claim, stated as a benefit rather than as
                architecture. "Verify once, reuse many" is what we call it; this
                is what it means to the person doing it. */}
            <h3>{t('home.step3')}</h3>
            <p>{t('home.step3Body')}</p>
          </li>
        </ol>
      </section>

      {/* Coerced: `length && jsx` renders a literal 0 when the array is empty,
          because React prints a number where it skips false. */}
      {!!(facets.org_type?.length || facets.course_level?.length) && (
        <section className="home-section">
          <h2>{t('home.browse')}</h2>

          {/* Entry points, not filters. Each is a link into the directory with
              the filter already applied, so a visitor who knows they want a
              government scheme gets there in one tap instead of finding the
              control that does it. */}
          {!!facets.org_type?.length && (
            <>
              <h3>{t('home.browseWho')}</h3>
              <div className="chips">
                {facets.org_type.map(f => (
                  <Link key={f.value} className="chip-link" to={`/scholarships?org_type=${f.value}`}>
                    {f.label} <span className="muted">({f.count})</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {!!facets.course_level?.length && (
            <>
              <h3>{t('home.browseLevel')}</h3>
              <div className="chips">
                {facets.course_level.map(f => (
                  <Link key={f.value} className="chip-link" to={`/scholarships?course_level=${f.value}`}>
                    {f.label} <span className="muted">({f.count})</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* The words and the button side by side, so a band the width of a
          monitor reads as one statement rather than three lines in the corner
          of it. */}
      <section className="home-cta">
        <div>
          <h2>{signedIn ? t('home.signedInCta') : t('home.cta')}</h2>
          {!signedIn && <p>{t('home.ctaBody')}</p>}
        </div>
        <Link className="btn primary" to={signedIn ? '/matches' : '/register'}>
          {signedIn ? t('nav.matches') : t('home.ctaButton')}
        </Link>
      </section>
    </div>
  )
}
