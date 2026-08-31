import * as api from '../../lib/api'
import { useQuery } from '../../lib/hooks'
import { useI18n } from '../../lib/i18n-context'
import { count, money } from '../../lib/format'
import { Empty, ErrorState, Loading } from '../../components/ui'
import type { Facet, Listing } from '../../lib/types'

/* What the platform is actually carrying.
 *
 * Every number on this page is counted from the open directory at the moment
 * the page loads — the same endpoint the directory itself uses, no separate
 * reporting table, nothing cached from a quarter ago. That is the only kind of
 * impact figure worth publishing: one that cannot drift from what a visitor can
 * go and check on the next page.
 *
 * ---------------------------------------------------------------------------
 * What is deliberately not counted
 * ---------------------------------------------------------------------------
 *
 * Students helped. Money disbursed. Applications approved. The platform knows
 * all three and the analytics service already computes them — and they are not
 * here, because on a seeded demonstration database they would be invented
 * numbers on a public page. An impact page that flatters itself is worth
 * nothing to the students it claims to serve, and the section at the foot of
 * this page says so out loud rather than leaving the omission to be noticed.
 *
 * When the figures are real, they come from GET /admin/overview's disbursement
 * totals, and they belong here.
 */
export default function Impact() {
  const { t } = useI18n()

  const query = useQuery<{ listings: Listing[]; facets: Record<string, Facet[]> }>(
    // Everything open, so the sums below are of the whole set rather than of
    // the first page of it.
    signal => api.get('/public/scholarships', { page_size: 100 }, signal),
    [],
  )

  if (query.loading && !query.data) return <div className="page"><Loading /></div>
  if (query.error) {
    return <div className="page"><ErrorState error={query.error} onRetry={query.reload} /></div>
  }

  const listings = query.data?.listings ?? []
  const facets = query.data?.facets ?? {}

  const total = query.meta?.total ?? listings.length
  const onOffer = listings.reduce((sum, l) => sum + l.award_amount, 0)
  const providers = new Set(listings.map(l => l.organisation_name)).size
  const states = facets.state_code?.length ?? 0

  return (
    <div className="page">
      <h1>{t('impact.title')}</h1>
      <p className="lede">{t('impact.lede')}</p>

      {total === 0 ? (
        <Empty title={t('impact.empty')} />
      ) : (
        <>
          <ul role="list" className="figures">
            <Figure value={count(total)} label={t('impact.open')} hint={t('impact.openHint')} />
            <Figure value={money(onOffer)} label={t('impact.value')} hint={t('impact.valueHint')} />
            <Figure value={count(providers)} label={t('impact.providers')} hint={t('impact.providersHint')} />
            <Figure value={count(states)} label={t('impact.states')} hint={t('impact.statesHint')} />
          </ul>

          <div className="impact-splits">
            <Split title={t('impact.byProvider')} facet={facets.org_type} of={total} />
            <Split title={t('impact.byLevel')} facet={facets.course_level} of={total} />
          </div>
        </>
      )}

      {/* Said plainly, and not in small print. */}
      <section className="card impact-honest" aria-labelledby="impact-honest">
        <h2 id="impact-honest">{t('impact.honest')}</h2>
        <p>{t('impact.honestBody')}</p>
      </section>
    </div>
  )
}

/* One figure.
 *
 * The number first and large, its name under it. A stat tile that leads with
 * the label makes the reader do the work of finding the number in it. */
function Figure({ value, label, hint }: { value: string; label: string; hint: string }) {
  return (
    <li className="figure">
      <strong>{value}</strong>
      <span className="figure-label">{label}</span>
      <span className="muted">{hint}</span>
    </li>
  )
}

/* A breakdown, as a bar per row.
 *
 * The bar is a proportion of the whole set, and the count is printed beside it —
 * the length is the fast read and the number is the accurate one, so neither a
 * reader who cannot judge relative lengths nor one using a screen reader is left
 * with only the other. */
function Split({ title, facet, of }: { title: string; facet?: Facet[]; of: number }) {
  if (!facet?.length) return null

  return (
    <section aria-labelledby={`split-${title}`}>
      <h2 id={`split-${title}`}>{title}</h2>
      <ul role="list" className="bars">
        {facet.map(f => (
          <li key={f.value}>
            <span className="bar-label">{f.label}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${Math.round((f.count / of) * 100)}%` }} />
            </span>
            <span className="bar-count">{count(f.count)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
