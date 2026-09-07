import { Link, useParams } from 'react-router-dom'

import * as api from '../../lib/api'
import { useQuery } from '../../lib/hooks'
import { ErrorState, Loading } from '../../components/ui'

/* A page written in the admin panel rather than in this repository.
 *
 * The pages with behaviour — the directory, a scheme's own page, the
 * registration form — are components and stay components. This renders the ones
 * that are only words: a partner programme, a state's scheme explained, a
 * campaign that runs for six weeks. See backend migration 0042.
 *
 * # Why the blocks are a closed set
 *
 * There is no HTML here, and the operator was not given a field for it. This
 * site's readers are students with disabilities; a paste from a word processor
 * is how a public page ends up with 11px grey text on white, a table that will
 * not reflow at 320px, and headings skipping h1 to h4. Nothing in the build
 * could catch it — `npm run check:contrast` and `check:responsive` read the
 * stylesheet, not the database.
 *
 * So the operator says what a thing IS and this file decides how it looks,
 * using the same classes as every coded page. A page published here cannot be
 * off-brand, cannot fail contrast and cannot break at 320px, because none of
 * those are choices it is offered. The cost is that a layout nobody anticipated
 * needs a new block type and a deploy, which is the right thing to be expensive.
 *
 * # This route is last
 *
 * It matches `/:slug`, so it would swallow every other route if it were
 * registered above them. See App.tsx: it sits directly before the 404, and the
 * server refuses to save a page whose address collides with a compiled route —
 * both, because either alone leaves a page that saves successfully and can
 * never be seen.
 */

type Block =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'notice'; text: string }
  | { type: 'button'; label: string; href: string }
  | { type: 'faq'; items: { q: string; a: string }[] }

interface PageData {
  title: string
  slug: string
  blocks: Block[]
}

export default function Page() {
  const { '*': wildcard } = useParams()
  const slug = (wildcard ?? '').replace(/^\/+|\/+$/g, '')

  const query = useQuery<PageData>(
    signal => api.get(`/public/pages/${slug}`, undefined, signal),
    [slug],
  )

  if (query.loading) return <Loading label="Loading" />
  /* A missing page arrives here as a 404 from the API, and ErrorState says so.
   * Not routed to the app's own NotFound screen: this component has already
   * been matched, and re-routing mid-render to show the same message in a
   * different place is a redirect nobody benefits from. */
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} />
  if (!query.data) return null

  const { title, blocks } = query.data

  return (
    <div className="page">
      {/* The page's own h1. Every block heading below is an h2, and the editor
          offers no level control — a heading-level dropdown is how a document
          ends up going h1, h4, h2. */}
      <h1>{title}</h1>

      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return <h2 key={i}>{b.text}</h2>

          case 'text':
            /* Split on blank lines, so an operator gets paragraphs by pressing
               return twice — the thing everybody already does — without the
               site having to accept markup to get them. */
            return (
              <div key={i}>
                {b.text.split(/\n{2,}/).map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            )

          case 'notice':
            /* role="note", and a visible label rather than colour alone. The
               same rule the rest of the site follows: colour never carries the
               meaning, so this reads as set apart on a monochrome screen. */
            return (
              <aside key={i} className="page-notice" role="note">
                <p>{b.text}</p>
              </aside>
            )

          case 'button':
            /* A router Link, not an anchor. The server refuses anything but an
               internal path, so this is always in-app — and an <a> would drop
               the SPA and reload the whole bundle to move one page. */
            return (
              <p key={i}>
                <Link className="btn primary" to={b.href}>{b.label}</Link>
              </p>
            )

          case 'faq':
            /* A description list, not collapsible panels. Content behind a
               disclosure does not appear in the browser's own find-on-page, and
               this audience includes people who rely on one. */
            return (
              <dl key={i} className="page-faq">
                {b.items.map((it, j) => (
                  <div key={j}>
                    <dt>{it.q}</dt>
                    <dd>{it.a}</dd>
                  </div>
                ))}
              </dl>
            )

          default:
            /* A block type this build does not know — an older bundle against a
               newer API. Skipped silently: the alternative is an error box in
               the middle of somebody's page for content the rest of which is
               fine, and the server already refuses unknown types on save, so
               reaching here means a deploy is mid-flight. */
            return null
        }
      })}
    </div>
  )
}
