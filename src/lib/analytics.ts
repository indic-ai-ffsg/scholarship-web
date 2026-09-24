/* Google Analytics, one page view per route.
 *
 * The id is configuration, not source: GA_MEASUREMENT_ID on the container
 * (published in /config.js) or VITE_GA_MEASUREMENT_ID in .env for development.
 * Unset, nothing is loaded and nothing is sent — see .env.example.
 *
 * The tag is loaded from here rather than written into index.html, because the
 * id is not known until runtime-config has read it. Configured with
 * send_page_view: false. Left to itself gtag counts a page when the document
 * loads, and this is a
 * single-page app: a visitor who lands on the home page and reads the
 * directory, a scheme and the sign-in screen loads one document, so Analytics
 * saw one page. The hook below sends the rest, on every route change.
 *
 * What it sends is the route, not the address. A portal path carries the id of
 * one student's application — /applications/<uuid> — and a query string can
 * carry a search or a ?next= destination. Neither is Analytics' business: ids
 * are collapsed to ":id" and the query is dropped, so the report reads
 * "/applications/:id", which answers how the page is used without logging who
 * opened what.
 *
 * Consent. lib/visit.ts argues this site needs no consent banner because it
 * sets no cookie and loads no third-party script. Google Analytics does both,
 * so that argument no longer covers the site: under the DPDP Act the _ga
 * cookie is an identifier on the student's device, and notice — probably
 * consent — is owed before it is set. This was added on the product owner's
 * decision (2026-09-24) with that open.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { setting } from './runtime-config'

type Gtag = (command: 'event', name: string, params: Record<string, string>) => void

/* A segment that names one record rather than a page: a UUID, or any run of
 * digits — reference codes and numeric ids alike. A scheme's slug is words
 * and stays, since the public scheme page is one page per scheme. */
const ID_SEGMENT = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i

export function routeOf(pathname: string): string {
  return pathname
    .split('/')
    .map(s => (ID_SEGMENT.test(s) ? ':id' : s))
    .join('/')
}

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag }

/* Loads Google's tag once, if an id is configured. Async and injected after
 * the app has started, so it never holds up first paint. Google signals and ad
 * personalisation are off: this is a scholarship service for disabled
 * students, not an audience to be sold. */
function loadTag(): boolean {
  const w = window as GtagWindow
  if (w.gtag) return true
  const id = setting('GA_MEASUREMENT_ID')
  // A measurement id is G- and letters/digits; anything else is a typo in the
  // environment, and is not worth putting into a script URL.
  if (!/^G-[A-Z0-9]+$/i.test(id)) return false

  w.dataLayer = w.dataLayer || []
  // gtag.js reads the arguments object itself, so this must stay a function
  // pushing `arguments` rather than an array of parameters.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments)
  } as Gtag
  const call = w.gtag as unknown as (...a: unknown[]) => void
  call('js', new Date())
  call('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
  return true
}

export function trackPage(pathname: string): void {
  if (!loadTag()) return
  const gtag = (window as GtagWindow).gtag
  if (typeof gtag !== 'function') return
  const route = routeOf(pathname)
  gtag('event', 'page_view', {
    page_path: route,
    page_location: window.location.origin + route,
    page_title: document.title,
  })
}

/* Mounted once in App, beside usePageVisit, so no page has to remember it. */
export function usePageAnalytics(): void {
  const location = useLocation()

  useEffect(() => {
    trackPage(location.pathname)
  }, [location.pathname])
}
