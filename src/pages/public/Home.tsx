import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useQuery } from '../../lib/hooks'
import { useI18n } from '../../lib/i18n-context'
import { awardLabel, count } from '../../lib/format'
import { Deadline, Field } from '../../components/ui'
import Slides, { Illustration, LeadWords } from '../../components/Slides'
import OrgMark from '../../components/OrgMark'
import { IconAward, IconCalendar, IconProvider } from '../../components/icons'
import type { Facet, Listing } from '../../lib/types'

/* The landing page.
 *
 * For a great many visitors this is the only page they will read. Somebody
 * arrives from a printed notice on a college wall or a forwarded message, and
 * decides here whether any of this is worth creating an account for. Table 4.1
 * gives the public site one job — "determine whether help exists" — so the
 * page answers that before it asks for anything.
 *
 * One hero, not two. The page used to open with the announcement band's lead
 * panel — a headline, a sentence and three claims — and then a second hero
 * under it with its own h1, lede and buttons. Two openings in a row is a page
 * that has not decided what it is saying, and every rule of hierarchy below it
 * was spent separating them. The lockup is now the hero's eyebrow, the
 * proposition's sentence is its lede, and the band above shows only what the
 * operators published — so on most days it is not there at all.
 *
 * What follows is the reasoning the page was built on, and it still holds:
 *
 * The band leads: its first panel is the proposition —
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

/* The steps, as numbers rather than as seven copies of the same JSX. Their copy
   lives in i18n-strings.ts under home.step1…home.step7. */
const STEPS = [1, 2, 3, 4, 5, 6, 7]

/* The helpline, written once and in both forms it is needed in.
 *
 * Not in the string table, because it is not copy: nothing about it changes
 * with the language, and a translator given a phone number to carry is a
 * translator who can mistype one. The two forms are not interchangeable — a
 * dialler wants +91 and no spaces, a reader wants the grouping printed on a
 * phone bill — and keeping them adjacent is what stops one being updated
 * without the other.
 *
 * If this number starts changing per deployment, it belongs in runtime-config
 * alongside the widget id rather than in a rebuild. It has not, so it does not. */
const HELPLINE = { dial: '+917628953752', label: '+91-76289-53752' }

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
  /* Whether anything in the panel is genuinely close. Seven days is the same
     threshold format.deadlineLabel uses for its "soon" state, deliberately: one
     definition of urgent, so the heading and the rows agree. */
  const soonest = listings.slice(0, 3)
  const urgent = soonest.some(l => l.days_remaining !== undefined && l.days_remaining <= 7)
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
      <Slides withLead={false} />

      {/* Two columns where there is room for them.
        *
        * The hero was one column of text with the right half of a wide screen
        * empty beside it, and the schemes closing soonest were four screens
        * further down — past the explanation, which is the part a returning
        * visitor does not need. The deadline is the perishable thing on this
        * page, so it sits next to the pitch rather than under it. */}
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-main">
          {/* The lockup, as the eyebrow over the title rather than a headline of
              its own. It is the site's argument and it stays in its three
              colours; it is not the page's name, which is what an h1 is for.
              A paragraph, so the outline goes straight to the h1. */}
          <p className="hero-eyebrow"><LeadWords /></p>

          <h1 id="home-title">{t('home.title')}</h1>
          <p className="hero-lede">{t('slides.lead.body')}</p>

          {/* The two ways in, before the search rather than after it.
            *
            * Measured at 1280x800 when they sat under the search, this row ran
            * 834 to 883 — entirely off screen — so the visitor who is here to
            * find out whether any of this applies to them had no visible way
            * forward. The search is labelled "(optional)", and an optional
            * control should not outrank the two primary ones. */}
          <div className="hero-actions">
            {/* The full sentence here, where there is room for it. The masthead
                and the footer use the shorter nav label. */}
            <Link className="btn primary" to="/register">{t('public.cta')}</Link>
            <Link className="btn" to="/scholarships">{t('home.browseAll')}</Link>
          </div>

          {/* On a panel of its own, so it reads as the second way in rather than
              as a form field loose on the hero's wash. */}
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

          {/* Rendered only once the number is known: "0 scholarships open"
              for half a second while the request is in flight is worse than
              nothing. And zero is not a small count but a different situation,
              which needs different words — see home.openNone. */}
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

          {/* The three claims. A list, so a screen reader counts them; the
              ticks are decoration and the sentences carry the meaning. */}
          <ul role="list" className="hero-points">
            {[t('slides.lead.free'), t('slides.lead.languages'), t('slides.lead.support')].map(point => (
              <li key={point}>
                <span className="tick" aria-hidden="true">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* The drawing, in the middle column: between the words and the
            deadlines, so it separates the two rather than competing with either.
            Decoration only — hidden from assistive technology inside the
            component — and dropped wherever the window has no third column to
            give it. slide-lead-reveal is the lead panel's one-off entrance: the
            branches draw out from the trunk and the cards arrive after them. */}
        <div className="hero-art slide-lead-reveal"><Illustration /></div>

        {/* The perishable thing on the page, beside the pitch rather than under
            it. */}
        {listings.length > 0 && (
          <aside className="hero-side" aria-labelledby="closing-soon">
            <div className="card">
              <div className="hero-side-head">
                <span className="hero-side-icon" aria-hidden="true"><IconCalendar /></span>
                <div>
                  {/* The heading follows the data: `urgent` is the same seven
                      days the deadline mark uses, so title and rows agree. */}
                  <h2 id="closing-soon">{t(urgent ? 'home.closing' : 'home.closingNext')}</h2>
                  <p className="muted small">
                    {t(urgent ? 'home.closingLede' : 'home.closingNextLede')}
                  </p>
                </div>
              </div>

              {/* A compact list, not the directory's cards: the job here is
                  "there is a deadline this week". */}
              <ul role="list" className="deadline-list">
                {soonest.map(l => (
                  <li key={l.scholarship_id}>
                    {/* Whose scheme it is, before its name — the same mark the
                        matched list and the applications carry, so a sponsor
                        is recognisable by shape across the site. The monogram
                        underneath means a sponsor with no logo still gets a
                        mark, and nothing moves when one arrives. */}
                    {/* By scholarship: a directory listing carries no
                        organisation id, and the scholarship's own logo route is
                        the one that answers for a curated scheme and a tenant's
                        alike. */}
                    <OrgMark scholarshipID={l.scholarship_id} name={l.organisation_name} />
                    <div className="deadline-body">
                      <Link to={`/scholarships/${l.slug}`}>{l.title}</Link>
                      <p>
                        {/* The award's mark, the same lockup as the deadline's
                            clock beside it: a glyph hidden from assistive
                            technology, and the words carrying the meaning. */}
                        <span className="amount">
                          <span className="mark" aria-hidden="true">💰</span>
                          {awardLabel(t, l.award_amount, l.benefit_summary)}
                        </span>
                        <Deadline days={l.days_remaining} />
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link className="btn quiet" to="/scholarships">
                {t('home.allDeadlines')} <span className="go" aria-hidden="true">→</span>
              </Link>
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
        <p className="lede">{t('home.howLede')}</p>

        <div className="how-body">
          {/* Generated rather than written out seven times.
              *
              * The steps differ only in their number, and seven copies of the
              * same three lines is seven places for one of them to drift — a
              * heading that stops being an h3, a body that keeps a class the
              * others lost. The keys are built from the number for the same
              * reason; every one of them is defined in i18n-strings.ts, where
              * a gap is visible as a gap. */}
          <ol role="list" className="steps">
            {STEPS.map(n => (
              <li key={n}>
                {/* A card per step, on the rail. The li keeps the rail and the
                    numeral; the card is what the eye lands on. */}
                <div className="step-card">
                  <h3>{t(`home.step${n}`)}</h3>
                  <p>{t(`home.step${n}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Beside the steps, not after them: both halves answer somebody who
              is deciding whether to start, and an answer below seven steps
              arrives after the decision it was meant to change. */}
          <aside className="how-aside">
            <h3>{t('home.assure')}</h3>
            <ul role="list" className="assurances">
              {[t('home.assure1'), t('home.assure2'), t('home.assure3')].map(point => (
                <li key={point}>
                  {/* The same lockup as the lead panel's points: a disc with a
                      tick in it, decorative and hidden, with the sentence
                      carrying the meaning on its own. */}
                  <span className="tick" aria-hidden="true">✓</span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="helpline">
              <h3>{t('home.help')}</h3>
              <p>{t('home.helpBody')}</p>
              {/* A tel: link rather than a number to copy out. On the phone
                  this page is most often read on it dials; on a desktop it is
                  still selectable text, which is what somebody writing it down
                  needs. The href is the dialable form and the label is the
                  grouped one — the same split as the sign-in field, where the
                  number a person reads and the number a machine takes are not
                  spelled the same way. */}
              <a className="btn" href={`tel:${HELPLINE.dial}`}>
                {t('home.helpCall', { number: HELPLINE.label })}
              </a>
            </div>
          </aside>
        </div>
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
              <ul role="list" className="browse-grid">
                {facets.org_type.map(f => (
                  <li key={f.value}>
                    <Link className="browse-tile" to={`/scholarships?org_type=${f.value}`}>
                      <span className="browse-icon" aria-hidden="true"><IconProvider /></span>
                      <span className="browse-label">{f.label}</span>
                      {/* The count in brackets, as it always was, so a screen
                          reader still hears "Corporate (3)"; the badge is
                          only the drawing around the number. */}
                      <span className="browse-count">
                        <span className="sr-only">(</span>{f.count}<span className="sr-only">)</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!!facets.course_level?.length && (
            <>
              <h3>{t('home.browseLevel')}</h3>
              <ul role="list" className="browse-grid">
                {facets.course_level.map(f => (
                  <li key={f.value}>
                    <Link className="browse-tile" to={`/scholarships?course_level=${f.value}`}>
                      <span className="browse-icon" aria-hidden="true"><IconAward /></span>
                      <span className="browse-label">{f.label}</span>
                      {/* The count in brackets, as it always was, so a screen
                          reader still hears "Corporate (3)"; the badge is
                          only the drawing around the number. */}
                      <span className="browse-count">
                        <span className="sr-only">(</span>{f.count}<span className="sr-only">)</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* The words and the button side by side, so a band the width of a
          monitor reads as one statement rather than three lines in the corner
          of it. */}
      <section className="cta-band">
        <div>
          <h2>{signedIn ? t('home.signedInCta') : t('home.cta')}</h2>
          {!signedIn && <p>{t('home.ctaBody')}</p>}
        </div>
        {/* Inverse, not .primary: a green button on a band that starts in the
            same green would vanish into it. */}
        <Link className="btn cta-inverse" to={signedIn ? '/matches' : '/register'}>
          {signedIn ? t('nav.matches') : t('home.ctaButton')}
        </Link>
      </section>
    </div>
  )
}
