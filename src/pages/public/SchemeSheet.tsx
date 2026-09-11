import { Link } from 'react-router-dom'

import * as api from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useQuery } from '../../lib/hooks'
import { withNext } from '../../lib/next'
import { useI18n } from '../../lib/i18n-context'
import { applyRoute, externalHelpKey } from '../../lib/apply'
import { useApplied } from '../../lib/applied'
import { asLines, awardLabel, date, stripNumbering } from '../../lib/format'
import { Deadline, ErrorState, Loading, SponsorLogo } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { usePageTitle } from '../../lib/page-title'
import { renderRichText } from '../../lib/richtext'
import { isBenefitTable, parseBenefits } from '../../lib/benefits'
import type { Listing } from '../../lib/types'

/* One scheme, read without leaving the list.
 *
 * The panel is the shorter form of /scholarships/<slug> and deliberately not a
 * second implementation of it: the three facts, the prose, and the one action.
 * What differs is the frame — a reader comparing four schemes stays in the
 * list, and a reader who arrived on a shared link gets a page.
 *
 * The criteria checklist is the one thing the page has and this does not. The
 * panel is read against three other schemes, and a tick-list of provider
 * sentences ("This scheme is open to students who are male and female") is the
 * longest and least scannable thing that could sit between the award and the
 * Apply button. `eligibility_summary` below says the same in prose for anyone
 * who wants it here, and the full page has the checklist for anyone who wants
 * to measure themselves against it line by line.
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

  /* The same lookup the row uses, from the same shared cache — opening a panel
     over a list that already asked must not ask again. The hook is called here
     with the rest of them; the id it is asked about comes from `s` below, so
     the lookup itself happens after the scheme is in hand. */
  const { applicationFor } = useApplied(status === 'authenticated')

  const query = useQuery<Listing>(
    signal => api.get(`/public/scholarships/${slug}`, undefined, signal),
    [slug],
  )

  const s = query.data ?? seed
  /* `s?.` because the seed is optional: a panel opened by a direct URL has no
     row behind it and renders from the query alone, so there is nothing to ask
     about until it lands. */
  const appliedID = s ? applicationFor(s.scholarship_id) : undefined

  /* The tab takes the scheme's name while the panel is open.
   *
   * The full page used to do this and 2.4.2 asks for it: /scholarships/<slug>
   * is now this panel, so without it every forwarded scheme link opens a tab
   * reading "Scholarships" — the same words as the directory it is sitting on,
   * which is precisely the case that criterion exists for.
   *
   * Above the early return, because it is a hook and the loading branch below
   * returns before it otherwise. Undefined until the name arrives, which
   * usePageTitle treats as "no override" and leaves the directory's title
   * standing; it also clears on unmount, so closing hands the tab back. */
  usePageTitle(s?.title)

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

  /* Where Apply goes. One decision, shared with the row that opened this panel
   * and with the scheme page and the matched list — see lib/apply.ts. */
  const route = applyRoute(s)

  const closed = s.days_remaining !== undefined && s.days_remaining < 0
  /* Deduplicated: two rules that render to the same sentence are one thing to
     read, and printed twice they read as a fault rather than as two rules that
     agree. */
  const criteria = [...new Set(s.criteria ?? [])]

  return (
    <Sheet open onClose={onClose} labelledBy="sheet-title" footer={
      <>
        {/* The same branch the row uses, in the same order and for the same
            reasons — the long note is at ListingCard's rail. Closed, then the
            session, then where a signed-in student is sent. The panel and the
            row that opened it must not offer different doors. */}
        {closed ? (
          <p className="muted" style={{ margin: 0 }}>{t('public.closedNote')}</p>
        ) : status === 'loading' ? null : appliedID ? (
          /* Already applied. The panel and the row it opened from must not
             offer different doors, so this mirrors ListingCard exactly — a link
             to the application rather than a disabled button, read from the
             application record rather than from any second notion of applied. */
          <Link className="btn wide" to={`/applications/${appliedID}`}>
            {t('match.applied')}
          </Link>
        ) : status !== 'authenticated' ? (
          <Link className="btn primary wide" to={withNext('/register', '/matches')}>
            {t('public.registerToApply')}
          </Link>
        ) : route.kind === 'external' ? (
          /* The label carries the destination, as it does on the row. The
             footer has the room the card rail does not, so the sentence sits
             under the button rather than being left to the scheme page. */
          <>
            <a
              className="btn primary wide"
              href={route.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('public.applyExternal')}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> ({t('common.newTab')})</span>
            </a>
            <p className="listing-apply-note">
              {t(externalHelpKey(route), { org: s.organisation_name })}
            </p>
          </>
        ) : (
          <Link className="btn primary wide" to={route.to}>
            {t('public.applyNow')}
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
          * they do not yet know is what it pays and how long they have — so
          * that is what this opens with, and the rules are left to the page. */}
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

      {/* Who qualifies, back in the panel because the panel is now the only
          place a scheme is read — /scholarships/<slug> renders this too. It was
          taken out while the full page still existed and still carried it; with
          that page gone, removing it here would take the criteria out of the
          product altogether.
          *
          * Below the facts rather than above them, which is where the page had
          * it. The reader pressed a row that already showed them the first two
          * rules; what they came for is the award and the window. */}
      {criteria.length > 0 && (
        <section aria-labelledby="sheet-who">
          <h3 id="sheet-who">{t('public.whoFor')}</h3>
          {/* A checklist rather than bullets: each line is something to measure
              yourself against, and the mark says so where a disc says only
              "list item". */}
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
        {s.description && <Prose text={s.description} />}
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
          <Benefits text={s.benefit_description} />
        </section>
      )}

      {s.eligibility_summary && (
        <section aria-labelledby="sheet-elig">
          <h3 id="sheet-elig">{t('public.eligibilityDetail')}</h3>
          {/* The panel's own marks, rendered. It was <Prose>, which split on
              newlines and printed "**40% or more**" with its asterisks. */}
          <div className="richtext">{renderRichText(s.eligibility_summary)}</div>
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
          {/* Still forced to an ordered list: these are steps in sequence
              whether or not the operator typed the digits, which is the one
              thing the shared renderer cannot know from the text alone. */}
          <Prose text={s.application_process} ordered />
        </section>
      )}

      {/* Last, and in a notice rather than a section: these are the caveats —
          a second deadline, a quota, the year the scheme was suspended — and
          they qualify everything above them, so they have to be read after it
          and be visibly a different kind of thing. */}
      {s.important_notes && (
        <div className="notice warn sheet-notes">
          <h3>{t('public.importantNotes')}</h3>
          <div className="richtext">{renderRichText(s.important_notes)}</div>
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

/* Operator free text, rendered as the shape it was written in.
 *
 * Every one of these fields is a textarea in the admin panel, and three of them
 * are captioned as lists — "the steps, in order", "instalments, what is covered,
 * what is not". Operators write them that way. The sheet used to render all of
 * them as one <p style="white-space: pre-line">, which draws the line breaks and
 * stops there: six application steps arrived as a six-line slab with no spacing
 * between them, no markers, and nothing for a screen reader to announce a count
 * from. It read as a paragraph that had been damaged.
 *
 * So: more than one line means a list, and one line means a paragraph. The
 * decision is the text's, not a flag on the column, because the same column
 * genuinely holds both — "Full tuition and a monthly stipend" is a sentence and
 * belongs in a <p>.
 *
 * `ordered` is for the one field that is a sequence rather than a set. It is not
 * inferred from the author's "1." — a numbered <ol> is right for application
 * steps whether or not somebody typed the digits, and wrong for a list of what a
 * scholarship covers even when they did.
 */
/* What the student gets, as the table the panel's editor writes.
 *
 * A real <table>: the two columns are a component and what it pays, and that is
 * a header-and-cells relationship rather than a visual arrangement. To a screen
 * reader it is the difference between "Academic expenses, tuition fees, hostel
 * fees" and hearing the column name before each value, which on a scheme with
 * six components is the difference between a table and a paragraph of amounts.
 *
 * The prose fallback is not a nicety. The column predates the table format, so
 * a scheme entered before it — or one whose operator typed a sentence — holds
 * text with no separators at all. isBenefitTable asks whether any row carries
 * an amount; without one, a table would assert an empty second column for every
 * row, which says "this pays nothing" where the truth is "this was not entered
 * as a table". Same column, two honest shapes.
 */
function Benefits({ text }: { text: string }) {
  const { t } = useI18n()
  const { intro, rows } = parseBenefits(text)

  if (!isBenefitTable(rows)) return <Prose text={text} />

  return (
    <>
      {intro && <p className="sheet-benefit-intro">{intro}</p>}
      <table className="sheet-benefits">
        <thead>
          <tr>
            <th scope="col">{t('public.benefitComponent')}</th>
            <th scope="col">{t('public.benefitAmount')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {/* scope="row": the component names the row, so a cell read on
                  its own is announced with what it is for. */}
              <th scope="row">{r.component}</th>
              <td>{r.amount || <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function Prose({ text, ordered }: { text: string; ordered?: boolean }) {
  const items = asLines(text)
  if (items.length === 0) return <p>{text}</p>

  return ordered
    ? <ol className="sheet-steps">{stripNumbering(items).map((l, i) => <li key={i}>{l}</li>)}</ol>
    : <ul className="sheet-points">{items.map((l, i) => <li key={i}>{l}</li>)}</ul>
}
