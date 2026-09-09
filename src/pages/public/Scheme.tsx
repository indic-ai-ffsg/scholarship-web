import { Link, useParams } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useQuery } from '../../lib/hooks'
import { withNext } from '../../lib/next'
import { useI18n } from '../../lib/i18n-context'
import { usePageTitle } from '../../lib/page-title'
import { awardLabel, date } from '../../lib/format'
import { Deadline, ErrorState, Loading } from '../../components/ui'
import type { Listing } from '../../lib/types'

/* One scheme, in full, without an account.
 *
 * The criteria are the point of this page. A visitor deciding whether to spend
 * twenty minutes creating a profile is entitled to know who the scheme is for
 * first — and the API returns those criteria as sentences the provider wrote,
 * so they are shown verbatim rather than reconstructed from rule operators.
 *
 * ---------------------------------------------------------------------------
 * Two columns, because there are two questions
 * ---------------------------------------------------------------------------
 *
 * "Is this for me" is answered by the criteria, which need reading. "Is it
 * worth it, and how long have I got" is answered by three facts, which need
 * finding. This was one column of identical full-width bands: the money was a
 * line of body text inside the first of them, and on a wide screen every band
 * held its content in the left third with the rest empty.
 *
 * So the reading goes in the main column at a readable measure, and the three
 * facts and the one action go in a panel beside it, which sticks as the criteria
 * scroll. On a narrow screen the panel comes first — on a phone, "₹25,000,
 * closes in two days" is the thing that decides whether the rest gets read.
 */
export default function Scheme() {
  const { slug } = useParams()
  const { t } = useI18n()
  const { status } = useAuth()

  const query = useQuery<Listing>(
    signal => api.get(`/public/scholarships/${slug}`, undefined, signal),
    [slug],
  )

  /* Before the early returns below, because it is a hook. Undefined while the
     request is in flight, which leaves the route's own title standing rather
     than blanking the tab for a second. */
  usePageTitle(query.data?.title)

  if (query.loading) return <div className="page"><Loading /></div>
  if (query.error) return <div className="page"><ErrorState error={query.error} onRetry={query.reload} /></div>
  if (!query.data) return null

  const s = query.data
  const summary = s.summary
  const description = s.description

  /* Deduplicated.
   *
   * A scheme with the same rule entered twice — which happens, and is in the
   * demo data — produced the same sentence twice in a row under "Who this is
   * for", and a list that repeats itself reads as a broken page rather than as
   * two rules that happen to agree. The set is built on the sentence because
   * that is what the reader sees: two differently-worded rules both survive. */
  const criteria = [...new Set(s.criteria ?? [])]

  /* The sponsor's own page, when this is a scheme we only list.
   *
   * Both halves matter. A TENANT scheme may also carry an external_url — the
   * admin field is offered for every listing — and for one of those the
   * application still belongs here, so the kind decides and the URL only
   * supplies the address. */
  const external =
    (s.listing_kind ?? 'TENANT') === 'CURATED' && s.external_url ? s.external_url : null

  return (
    <div className="page">
      <p className="breadcrumb"><Link to="/scholarships">← {t('public.back')}</Link></p>

      {/* The name and the summary sit above both columns.
        *
        * They were the first thing in the main column, which on a phone — where
        * the facts panel comes first — put the award, the deadline and the
        * provider ahead of the title of the thing they belong to. A reader,
        * and a screen reader, needs to know which scheme this is before being
        * told what it pays. */}
      <h1>{s.title}</h1>
      <p className="lede">{summary}</p>

      <div className="scheme">
        <div className="scheme-main">
          {criteria.length > 0 && (
            <section aria-labelledby="who-for" className="first">
              <h2 id="who-for">{t('public.whoFor')}</h2>
              {/* A checklist rather than bullets. Each line is a thing to
                  measure yourself against, and the mark says so — a disc says
                  only "list item". */}
              <ul role="list" className="criteria">
                {criteria.map((c, i) => (
                  <li key={i}>
                    <span className="mark" aria-hidden="true">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {description && (
            <section aria-labelledby="scheme-detail">
              <h2 id="scheme-detail">{t('public.about')}</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{description}</p>
            </section>
          )}
        </div>

        {/* aria-labelledby rather than a visible heading: the panel's content is
            three labelled facts, and a heading over them would be a fourth
            label saying nothing the labels do not. */}
        <aside className="scheme-facts" aria-label={t('public.atAGlance')}>
          <div className="card">
            <p className="fact-award">
              <span className="muted">{t('public.award')}</span>
              <strong>
                {awardLabel(t, s.award_amount, s.benefit_summary,
                  s.award_amount_min, s.award_amount_max)}
              </strong>
              {s.is_renewable && <span className="muted">{t('public.renewable')}</span>}
            </p>

            <hr />

            <dl className="facts">
              <div>
                <dt className="muted">{t('public.closes')}</dt>
                <dd>
                  {/* The countdown first and the date under it. "24 August" is
                      a fact somebody has to convert; "closes in 2 days" is the
                      one that decides what they do this afternoon. */}
                  <Deadline days={s.days_remaining} />
                  {s.closes_at && <span className="muted block">{date(s.closes_at)}</span>}
                </dd>
              </div>

              <div>
                <dt className="muted">{t('public.offeredBy')}</dt>
                <dd>{s.organisation_name}</dd>
              </div>
            </dl>

            {/* The one action, in the panel rather than at the foot of the page.
                A visitor who has read two criteria and decided should not have
                to scroll past the rest to act on it.

                For a visitor only. A signed-in student used to get "My matches"
                in this slot — a filled button whose whole effect is to leave the
                scheme they came here to read, for a list they arrived from. The
                panel's job on this page is the award, the closing date and the
                provider, and for somebody who already has an account those three
                are the entire answer. The rule goes with the button: a divider
                under the last fact, separating it from nothing, is a line the
                eye stops at for no reason. */}
            {/* Where Apply goes, and it is not always here.
                *
                * A CURATED listing is a scheme this platform lists but does not
                * run: no organisation, no workflow, and a database trigger
                * (backend 0026) that refuses any application row against it.
                * The student applies on the sponsor's own site, and
                * external_url is where. A TENANT scheme is run here and /apply
                * is the real thing.
                *
                * This branch is the whole point of the fix. The button used to
                * be an unconditional link to /apply for every signed-in reader,
                * because the API never sent external_url — so a scheme whose
                * operator had carefully entered https://scholarships.gov.in in
                * the admin panel still sent the student to
                * /apply/<uuid> on this site, where the form cannot submit. The
                * address existed in the database the whole time and nothing
                * carried it to the page that needed it.
                *
                * `?? 'TENANT'` because an older or cached API response has no
                * listing_kind, and TENANT is the column's own default. Falling
                * back the other way would send every reader off-site the moment
                * a stale response came back, which is the worse mistake.
                *
                * Nothing is drawn until the session resolves: `status` is
                * 'loading' on the first paint, and branching before it settles
                * puts one destination under the reader's finger and swaps it
                * for another. */}
            {status !== 'loading' && (
              <>
                <hr />
                {/* External before the session, and it used to be the other way
                    round.
                    *
                    * A CURATED scheme is administered somewhere else: no
                    * organisation, no workflow here, and a trigger (backend
                    * 0026) that refuses an application row against it. The
                    * sponsor's own form takes anybody, account or not — so
                    * testing the session first sent an anonymous reader to
                    * register for a scheme this platform will never process,
                    * and buried the one link that would have worked.
                    *
                    * The session decides only between the two doors that are
                    * ours: /apply for somebody who has an account, and
                    * registration for somebody who does not. */}
                {external ? (
                  /* A real anchor, not a Link: this leaves the site.
                     *
                     * target=_blank keeps the student's place here — they are
                     * mid-decision, and a government portal that swallows the
                     * tab costs them the criteria they were reading. rel is the
                     * pair that must always travel with it: noopener denies the
                     * opened page a handle on this one, noreferrer keeps our
                     * URL out of their logs.
                     *
                     * The new tab is announced rather than implied by the arrow,
                     * which is aria-hidden decoration. An unannounced new tab is
                     * one of the most disorienting things a screen reader user
                     * meets, and this audience is the reason that matters. */
                  <>
                    <a
                      className="btn primary wide"
                      href={external}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('public.applyExternal')}
                      <span aria-hidden="true"> ↗</span>
                      <span className="sr-only"> ({t('common.newTab')})</span>
                    </a>
                    <p className="muted small">
                      {t('public.applyExternalHelp', { org: s.organisation_name })}
                    </p>
                  </>
                ) : status === 'authenticated' ? (
                  <>
                    <Link className="btn primary wide" to={`/apply/${s.scholarship_id}`}>
                      {t('match.apply')}
                    </Link>
                    <p className="muted small">{t('public.applyHelp')}</p>
                  </>
                ) : (
                  /* "Register to apply", and it goes to the matched list rather
                     than back to this page — the note at Directory's rail has
                     the reasoning. The help line changes with it: the old one
                     sold registration as a way to find scholarships, which is
                     an odd pitch to somebody already reading one. */
                  <>
                    <Link className="btn primary wide" to={withNext('/register', '/matches')}>
                      {t('public.registerToApply')}
                    </Link>
                    <p className="muted small">{t('public.registerToApplyHelp')}</p>
                  </>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
