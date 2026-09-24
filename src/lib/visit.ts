/* Telling the platform that somebody came.
 *
 * The platform has never been able to answer "how many visitors" because every
 * figure it keeps requires an account. This is the missing half, and it is
 * deliberately the smallest possible version of it.
 *
 * ---------------------------------------------------------------------------
 * Why a beacon at all
 * ---------------------------------------------------------------------------
 *
 * The public site is a single-page app. A visitor moving from the landing page
 * to the directory changes the URL without asking the API for anything, so the
 * server never learns the page was viewed. Counting API calls instead would
 * measure something real but not what was asked for — it would miss every
 * visitor who read the landing page and left, who are exactly the people the
 * question is about.
 *
 * ---------------------------------------------------------------------------
 * What is NOT here, and why that is the point
 * ---------------------------------------------------------------------------
 *
 * No cookie. No localStorage identifier. No third-party script. No device
 * fingerprint computed in the browser. Nothing that persists between visits,
 * because nothing needs to: the server counts a day's distinct callers with a
 * hash that it throws away at midnight (migration 0063).
 *
 * (Google Analytics was added on 2026-09-24 — lib/analytics.ts — and it does
 * set a cookie and load a third-party script, so the paragraph below now
 * describes this beacon only, not the site.)
 *
 * That is why this site still has no consent banner. Under the DPDP Act a
 * tracker storing an identifier on a student's device is personal data
 * processing that needs notice and consent; a path sent to our own API, with no
 * identifier attached, is not. The restraint above IS the compliance argument —
 * adding "just a small cookie" to improve the numbers would quietly remove it.
 *
 * ---------------------------------------------------------------------------
 * And why only the public pages
 * ---------------------------------------------------------------------------
 *
 * The portal behind sign-in is not counted. A path like
 * /applications/<id> is a page only one student ever opens, and a table of
 * those is a behavioural log of one person's use of a disability scholarship
 * service — a far more sensitive thing than a visitor count, and not what
 * anybody asked for.
 *
 * The test is the ROUTE, not the session, and that is deliberate on both
 * counts. Gating on "is anybody signed in" would miss the visitor who lands and
 * leaves inside the session check, who is exactly the person being counted. And
 * an allowlist fails the safe way: a portal route added next year is not
 * counted until somebody adds it here on purpose, where a denylist would have
 * started logging it the day it shipped.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { setting } from './runtime-config'

/* Resolved the same way api.ts resolves it, through runtime-config rather than
 * straight off import.meta.env. The built bundle is one image deployed to every
 * environment, and the version is injected at container start — reading the
 * build-time value here would point the beacon at whichever version was current
 * when the image was built and quietly 404 everywhere else. */
const VERSION = setting('API_VERSION') || 'v1'
const ENDPOINT = `/api/${VERSION}/public/visit`

/* The public site, exactly. Kept beside App.tsx's route table in spirit, and
 * checked against it whenever a route is added.
 *
 * "/" is matched exactly rather than as a prefix, or it would admit everything. */
const PUBLIC_PREFIXES = ['/scholarships', '/register', '/signin', '/check']

/* CMS pages (0042) live at the top level under a wildcard, so they cannot be
 * listed. They are public by definition — the whole point of that route is a
 * page a super admin published for visitors — so a single-segment path that is
 * not a known portal route is treated as one. */
const PORTAL_PREFIXES = [
  '/dashboard', '/profile', '/matches', '/documents',
  '/apply', '/applications', '/my-data',
]

export function isPublicPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (path === '/') return true
  if (PORTAL_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return false
  if (PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return true
  // A CMS page: one segment, nothing else.
  return path.indexOf('/', 1) === -1
}

export function recordVisit(path: string): void {
  if (!isPublicPath(path)) return

  const body = JSON.stringify({ path })

  /* sendBeacon when it exists, because it survives the page being closed — a
   * visitor who reads one page and leaves is precisely the one this figure
   * exists to catch, and a fetch() started during unload is cancelled.
   *
   * sendBeacon defaults to text/plain, which Fiber's BodyParser will not read
   * as JSON. Passing a Blob with the type set fixes that, and application/json
   * on a same-origin POST stays simple enough not to cost a CORS preflight. */
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    // Some browsers throw rather than returning false when the payload is
    // refused. Fall through to fetch.
  }

  /* keepalive for the same unload reason. No credentials: this request must not
   * carry a session, so that a counted visit cannot be joined to an account
   * even accidentally — the privacy claim above has to be true of the wire, not
   * only of the table. */
  void fetch(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {
    // A metrics call is never worth an error on a page somebody came to read.
  })
}

/* Counts one view per public route the visitor lands on.
 *
 * Mounted once, high in the tree, and it reads the location itself rather than
 * taking a prop so that no page has to remember to call it. recordVisit drops
 * anything that is not public, so this is safe to mount above every route.
 */
export function usePageVisit(): void {
  const location = useLocation()

  useEffect(() => {
    recordVisit(location.pathname)
  }, [location.pathname])
}
