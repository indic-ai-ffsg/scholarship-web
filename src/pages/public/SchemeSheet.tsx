import { Link } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useQuery } from '../../lib/hooks'
import { withNext } from '../../lib/next'
import { useI18n } from '../../lib/i18n-context'
import { awardLabel, date } from '../../lib/format'
import { Deadline, ErrorState, Loading, SponsorLogo } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import type { Listing } from '../../lib/types'

/* One scheme, read without leaving the list.
 *
 * The panel is the same content as /scholarships/<slug> and deliberately not a
 * second implementation of it: both render the criteria the provider wrote, the
 * three facts and the one action, in that order. What differs is the frame — a
 * reader comparing four schemes stays in the list, and a reader who arrived on
 * a shared link gets a page.
 *
 * ---------------------------------------------------------------------------
 * It opens filled in, then fills in further
 * ---------------------------------------------------------------------------
 *
 * The row that was pressed already holds most of this: the directory's list
 * response carries the criteria, the award, the window and the sponsor. So the
 * panel renders from that immediately — no spinner between the press and the
 * content, which is the entire reason for opening in place rather than
 * navigating — and the detail request fills in whatever the list response does
 * not carry when it lands.
 *
 * `detail ?? listing` is what does it, and the order matters: the fetched copy
 * wins where it exists, because it is the newer read of the same row.
 */
export function SchemeSheet({
  slug, seed, onClose,
}: {
  slug: string
  /* The row that was pressed, when there was one.
   *
   * Absent when the address was opened directly — ?scheme= survives a reload
   * and a forwarded link, and the scheme it names need not be on the current
   * page of results. That case gets a spinner, which is the honest thing: there
   * is genuinely nothing to show yet. */
  seed?: Listing
  onClose: () => void
}) {
  const { t } = useI18n()
  const { status } = useAuth()

  const query = useQuery<Listing>(
    signal => api.get(`/public/scholarships/${slug}`, undefined, signal),
    [slug],
  )

  const s = query.data ?? seed

  if (!s) {
    return (
      <Sheet open onClose={onClose} title={t('sheet.loading')}>
        {query.error
          ? <ErrorState error={query.error} onRetry={query.reload} />
          : <Loading />}
      </Sheet>
    )
  }

  /* Deduplicated, as on the scheme page: a scheme with the same rule entered
   * twice renders the same sentence twice, which reads as a broken panel rather
   * than as two rules that agree. */
  const criteria = [...new Set(s.criteria ?? [])]

  /* The sponsor's own page, when this is a scheme the platform only lists.
   * The kind decides and the URL only supplies the address — see the note at
   * the same branch in Directory's ListingCard. */
  const external =
    (s.listing_kind ?? 'TENANT') === 'CURATED' && s.external_url ? s.external_url : null

  const closed = s.days_remaining !== undefined && s.days_remaining < 0

  return (
    <Sheet open onClose={onClose} labelledBy="sheet-title" footer={
      <>
        {closed ? (
          <p className="muted" style={{ margin: 0 }}>{t('public.closedNote')}</p>
        ) : external ? (
          <a
            className="btn primary wide"
            href={external}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('public.applyNow')}
            <span aria-hidden="true"> ↗</span>
            <span className="sr-only"> ({t('common.newTab')})</span>
          </a>
        ) : status === 'loading' ? null : status === 'authenticated' ? (
          <Link className="btn primary wide" to={`/apply/${s.scholarship_id}`}>
            {t('public.applyNow')}
          </Link>
        ) : (
          /* The same three-way branch the row uses, in the same order and for
             the same reasons — see the long note at ListingCard's rail. The
             panel and the row it opened from must not offer different doors. */
          <Link className="btn primary wide" to={withNext('/register', '/matches')}>
            {t('public.registerToApply')}
          </Link>
        )}
      </>
    }>
      <div className="sheet-head">
        <SponsorLogo listing={s} />
        <p className="sheet-eyebrow">
          {t('public.offeredBy')} <strong>{s.organisation_name}</strong>
        </p>
      </div>
      <h2 id="sheet-title">{s.title}</h2>

      {/* The three facts first, and that is not the page's order.
          *
          * On /scholarships/<slug> the criteria lead and the facts sit in a
          * panel beside them, because there is room for both at once. There is
          * not here: the panel is one column, and the reader pressed "view
          * details" on a row that already showed them the first two rules. What
          * they do not yet know is what it pays and how long they have. */}
      <dl className="sheet-facts">
        <div>
          <dt>{t('public.award')}</dt>
          <dd>
            <span className="amount">
              {awardLabel(t, s.award_amount, s.benefit_summary,
                s.award_amount_min, s.award_amount_max)}
            </span>
            {s.is_renewable && <span className="muted block">{t('public.renewable')}</span>}
          </dd>
        </div>
        <div>
          <dt>{t('public.closes')}</dt>
          <dd>
            <Deadline days={s.days_remaining} />
            {s.closes_at && <span className="muted block">{date(s.closes_at)}</span>}
          </dd>
        </div>
        {/* Both from the detail response, so both appear a moment after the
            panel opens rather than with it. In the facts strip and not as
            sections of their own: each is a word, and a heading over a word is
            a heading that says more than the thing it introduces. */}
        {s.academic_year && (
          <div>
            <dt>{t('public.academicYear')}</dt>
            <dd>{s.academic_year}</dd>
          </div>
        )}
        {s.award_basis && (
          <div>
            <dt>{t('public.awardBasis')}</dt>
            <dd>{t(`public.basis.${s.award_basis}`)}</dd>
          </div>
        )}
      </dl>

      {criteria.length > 0 && (
        <section aria-labelledby="sheet-who">
          <h3 id="sheet-who">{t('public.whoFor')}</h3>
          {/* A checklist rather than bullets, the same as the page: each line is
              something to measure yourself against, and the mark says so where
              a disc says only "list item". */}
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

      <section aria-labelledby="sheet-about">
        <h3 id="sheet-about">{t('public.about')}</h3>
        <p>{s.summary}</p>
        {s.description && <p style={{ whiteSpace: 'pre-line' }}>{s.description}</p>}
      </section>

      {/* What the operator wrote, in the order a reader asks for it.
        *
        * The four below are the point of the panel. They come from backend
        * 0027's columns, they have been filled in by the admin panel and the
        * discovery agent since that migration, and until 0048 carried them
        * through public_scholarship the public site could not read one of them
        * — so a student deciding whether to spend an afternoon on an
        * application had the sponsor's name and a figure, and nothing about
        * what the money covers or what they would have to produce.
        *
        * Each renders only when the sponsor said something. A "Documents
        * required" heading over nothing reads as a scheme that asks for
        * nothing, which is a different claim from a scheme that has not said.
        *
        * Order: what you get, then who qualifies in prose, then what to bring,
        * then what to do. That is the sequence of the questions somebody asks
        * once they have decided the scheme is worth reading — value, fit,
        * effort, action — and it puts the two that cost the reader something
        * last, where they are read by people who have already decided they
        * want it. */}
      {s.benefit_description && (
        <section aria-labelledby="sheet-get">
          <h3 id="sheet-get">{t('public.whatYouGet')}</h3>
          <p style={{ whiteSpace: 'pre-line' }}>{s.benefit_description}</p>
        </section>
      )}

      {s.eligibility_summary && (
        <section aria-labelledby="sheet-elig">
          <h3 id="sheet-elig">{t('public.eligibilityDetail')}</h3>
          <p style={{ whiteSpace: 'pre-line' }}>{s.eligibility_summary}</p>
        </section>
      )}

      {s.documents_required && s.documents_required.length > 0 && (
        <section aria-labelledby="sheet-docs">
          <h3 id="sheet-docs">{t('public.documentsRequired')}</h3>
          {/* Discs, not the criteria checklist. A tick means "you meet this",
              and the reader does not yet — these are things to go and find. */}
          <ul className="sheet-docs">
            {s.documents_required.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
          {/* Said plainly, because the alternative is a student uploading six
              documents here and waiting for a decision from a body that never
              received them. Backend 0027 keeps these as free text rather than
              as the platform's own document vocabulary for exactly this reason:
              nothing here is collected by this platform. */}
          <p className="muted small">{t('public.documentsHelp')}</p>
        </section>
      )}

      {s.application_process && (
        <section aria-labelledby="sheet-how">
          <h3 id="sheet-how">{t('public.howToApply')}</h3>
          <p style={{ whiteSpace: 'pre-line' }}>{s.application_process}</p>
        </section>
      )}

      {/* Last, and in a notice rather than a section: these are the caveats —
          a second deadline, a quota, the year the scheme was suspended — and
          they qualify everything above them, so they have to be read after it
          and be visibly a different kind of thing. */}
      {s.important_notes && (
        <div className="notice warn sheet-notes">
          <h3>{t('public.importantNotes')}</h3>
          <p style={{ whiteSpace: 'pre-line' }}>{s.important_notes}</p>
        </div>
      )}

      {/* Only when the fetch failed outright. A failure here costs the reader
          nothing they had — the row's own copy is already on screen — so it is
          a line at the foot rather than a panel that replaces the content. */}
      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
    </Sheet>
  )
}
