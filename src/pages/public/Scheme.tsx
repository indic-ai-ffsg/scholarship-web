import { Link, useParams } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useQuery } from '../../lib/hooks'
import { useI18n } from '../../lib/i18n-context'
import { awardLabel, date, deadlineLabel } from '../../lib/format'
import { ErrorState, Loading } from '../../components/ui'
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

  if (query.loading) return <div className="page"><Loading /></div>
  if (query.error) return <div className="page"><ErrorState error={query.error} onRetry={query.reload} /></div>
  if (!query.data) return null

  const s = query.data
  const { text: closing, soon } = deadlineLabel(t, s.days_remaining)
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
              <strong>{awardLabel(t, s.award_amount, s.benefit_summary)}</strong>
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
                  <span className={`deadline ${soon ? 'soon' : ''}`}>{closing}</span>
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
            {/* Two actions, one slot, and which one appears depends on whether
                there is an account behind the reader.
                *
                * A signed-in student had nothing here at all. The slot held
                * "My matches" once, that was removed as a button whose only
                * effect was to leave the page, and nothing replaced it - so the
                * scheme page, which is where somebody actually decides to
                * apply, was the one place in the product with no way to apply.
                * The matched list was the only route to /apply, which reaches
                * only the students who arrive that way: anybody following a
                * shared link, an SMS, a search result or the directory read the
                * criteria and hit a dead end.
                *
                * It links straight to /apply rather than testing eligibility
                * here first. This page is public and deliberately knows nothing
                * about the reader, and /apply already does the real check -
                * it holds the document checklist, the blocked reasons and the
                * consent record, and it refuses on can_apply. Hiding the button
                * behind a guess made here would mean a student who is eligible
                * and has one expired certificate is shown no button and no
                * reason, which is the failure this product is most careful
                * about elsewhere. Better to offer the action and let the next
                * screen explain itself.
                *
                * Nothing is drawn until the session resolves. `status` is
                * 'loading' on the first paint, so branching on
                * `!== 'authenticated'` put "Check now" in the slot for a moment
                * and then swapped it for Apply - two different destinations
                * under one position, which is a mis-press for anybody who
                * reached for the button as it changed. Appearing a moment late
                * costs a reader nothing; the panel is beside the criteria they
                * are still reading. */}
            {status !== 'loading' && (
              <>
                <hr />
                {status === 'authenticated' ? (
                  <>
                    <Link className="btn primary wide" to={`/apply/${s.scholarship_id}`}>
                      {t('match.apply')}
                    </Link>
                    <p className="muted small">{t('public.applyHelp')}</p>
                  </>
                ) : (
                  <>
                    <Link className="btn primary wide" to="/check">{t('check.go')}</Link>
                    <p className="muted small">{t('public.ctaHelp')}</p>
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
