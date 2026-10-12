import { useI18n } from '../lib/i18n-context'

/* Skeletons: the shape of a screen while its answer is on the way.
 *
 * One set, shared, so that every wait on the site looks like the same product
 * waiting. Before this, three pages drew their own (Apply, Matches, the
 * dashboard) and nine drew "Loading…" on a line by itself, which is a page
 * arriving all at once into a space that held nothing — the layout jump the
 * note in styles/components/loading.css describes.
 *
 * Every shape is aria-hidden; SkeletonStatus is the one thing a screen reader
 * hears, once, politely. A stack of fake paragraphs announced as content is
 * worse than silence. Reduced motion keeps the shapes and drops the sweep —
 * see loading.css. */

/** The single announcement that goes with a skeleton. */
export function SkeletonStatus() {
  const { t } = useI18n()
  return <p className="sr-only" role="status" aria-busy="true">{t('common.loading')}</p>
}

/** A list of placeholder cards, in the list's own container class so each
 *  sits where a real card will. */
export function SkeletonCards({
  count = 3, listClassName = 'sk-list', mark, badge, preview, lines = 2, action,
}: {
  count?: number
  /** The real list's class — its grid and gaps — so the cards line up. */
  listClassName?: string
  /** A square where the sponsor's mark goes. */
  mark?: boolean
  /** A pill where a status badge goes. */
  badge?: boolean
  /** A box where a document's preview goes. */
  preview?: boolean
  /** Body lines under the heading; the last is short. */
  lines?: number
  /** A button-height bar at the foot. */
  action?: boolean
}) {
  return (
    <>
      <SkeletonStatus />
      <ul className={listClassName} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <div className="skeleton-card sk-card">
              <div className="sk-head">
                {mark && <span className="skeleton-line sk-mark" />}
                <span className="sk-text">
                  <span className="skeleton-line head" />
                  <span className="skeleton-line sk-meta" />
                </span>
                {badge && <span className="skeleton-line sk-badge" />}
              </div>
              {preview && <span className="skeleton-line sk-preview" />}
              {Array.from({ length: lines }, (_, j) => (
                <span key={j} className={`skeleton-line${j === lines - 1 ? ' short' : ''}`} />
              ))}
              {action && <span className="skeleton-line button sk-action" />}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Rows inside one card — a list whose items share a box. */
export function SkeletonRows({
  count = 3, className = 'card sk-rows', mark, badge,
}: {
  count?: number
  /** The real list's class, so rows have its padding and dividers. */
  className?: string
  mark?: boolean
  badge?: boolean
}) {
  return (
    <>
      <SkeletonStatus />
      <ul className={className} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="sk-row">
            {mark && <span className="skeleton-line sk-mark" />}
            <span className="sk-text">
              <span className="skeleton-line short" />
              <span className="skeleton-line sk-meta" />
            </span>
            {badge && <span className="skeleton-line sk-badge" />}
          </li>
        ))}
      </ul>
    </>
  )
}

/** A whole page waiting: its title, a line under it, and two cards. For the
 *  waits that happen before a page knows what it is — a session being
 *  checked, a route's code arriving, a record being fetched. */
export function SkeletonPage({ narrow }: { narrow?: boolean }) {
  return (
    <div className={narrow ? 'page narrow' : 'page'}>
      <div className="sk-page-head" aria-hidden="true">
        <span className="skeleton-line sk-title" />
        <span className="skeleton-line sk-lede" />
      </div>
      <SkeletonCards count={2} lines={3} />
    </div>
  )
}
