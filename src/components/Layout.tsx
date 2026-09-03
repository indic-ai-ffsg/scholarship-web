import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../lib/auth-context'
import { SOCIAL } from '../lib/social'
import { useI18n } from '../lib/i18n-context'
import { OfflineBanner } from './ui'

/* The shell.
 *
 * The same masthead serves a visitor and a signed-in student; what changes is
 * the navigation, not the page. That is deliberate — the public site's job is
 * to let somebody determine whether help exists, and a visitor who then
 * registers should not feel they have arrived somewhere else.
 *
 * ---------------------------------------------------------------------------
 * Why the navigation is split in two
 * ---------------------------------------------------------------------------
 *
 * It used to be flat: seven destinations, a language toggle, a colour control
 * and a sign-out button, all in one wrapping row. On a phone that filled most
 * of the screen before any content, which is the precise opposite of this
 * portal's brief — "complete one task at a time without anxiety" (Table 4.1).
 *
 * So the row now carries only the four places a student actually moves between
 * while doing the thing they came to do: find a scheme, see what they match,
 * track what they applied for, and keep their documents current. Everything
 * else — the profile, the data rights screen, the people helping them, the
 * language and the colours — is account business, done occasionally and
 * deliberately, and lives behind one labelled control.
 *
 * A <details> rather than a scripted menu: it is keyboard-operable, announces
 * its own expanded state, and works before JavaScript has loaded on a slow
 * connection. What it does not do on its own is close when you click away or
 * press Escape, so those two are added below and nothing else is.
 *
 * Not a hamburger. Hiding the primary destinations behind an unlabelled icon
 * costs discoverability, and this audience pays that cost twice — once for the
 * icon and again for a target that shrank.
 */
export default function Layout() {
  const { t } = useI18n()
  const { status, signOut } = useAuth()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const lastPath = useRef(location.pathname)

  const signedIn = status === 'authenticated'

  /* Three things a single-page app does not do for itself on navigation, and
   * which the browser would have done on a full page load:
   *
   *   the title changes, so four open tabs are distinguishable;
   *   the view returns to the top, rather than landing the reader halfway down
   *     a new page because they had scrolled the previous one;
   *   focus moves into the content, which is what makes a screen reader read
   *     the new page rather than sit silently on the link that was clicked.
   *
   * Skipped on first paint, where taking focus would interrupt somebody who
   * has not started reading yet.
   *
   * That skip is keyed on the path having actually changed rather than on a
   * "first render" flag, and the difference is not academic: StrictMode mounts,
   * runs effects, tears them down and runs them again, so a flag set on the
   * first pass is already false on the second. The effect then focused <main>
   * on arrival — which scrolls it into view, and put the masthead 137px above
   * the top of the window on every single page load. The header was simply
   * gone, and no amount of reading the stylesheet would have found it. */
  useEffect(() => {
    document.title = `${titleFor(location.pathname, t)} · ${t('app.name')}`

    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname

    window.scrollTo({ top: 0, behavior: 'instant' })
    mainRef.current?.focus()
  }, [location.pathname, t])

  /* The class is toggled on the element rather than held in state.
   *
   * State would re-render the whole shell — and every page inside it — twice
   * for every scroll past the top of the document, to change one shadow. */
  useEffect(() => {
    const sentinel = sentinelRef.current
    const bar = barRef.current
    if (!sentinel || !bar) return

    const observer = new IntersectionObserver(
      ([entry]) => bar.classList.toggle('stuck', !entry.isIntersecting),
      { threshold: 1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">{t('nav.skip')}</a>

      {/* One pixel, watched, so the bar can tell whether it is stuck.
       *
       * A sticky bar that looks identical whether it is at the top of the page
       * or floating over the middle of it gives no clue that the content is
       * moving underneath. The shadow it gains when stuck is that clue.
       *
       * A sentinel and an observer rather than a scroll listener: the browser
       * reports the crossing once, instead of this running arithmetic on every
       * frame of every scroll on a phone that has better things to do. */}
      <div ref={sentinelRef} aria-hidden="true" className="topbar-sentinel" />

      {/* Banner and bar stick together, as one block.
       *
       * Both used to be sticky separately, which on a lost connection put two
       * elements at top: 0 with one covering the other. Sticking the pair keeps
       * the bar reachable at the bottom of the directory — this audience should
       * not have to scroll a page of forty results back to the top to get
       * anywhere — and keeps the offline notice where it was. */}
      <div className="topbar" ref={barRef}>
        <OfflineBanner />

        <header className="masthead">
        <div className="inner">
          {/* The mark over the name, as a lockup.
            *
            * It read "Scholarships · For students with disabilities" on one
            * line: a generic product word, and a sentence the page's own h1
            * repeats in larger type twenty pixels below. Stacked, the two lines
            * name the foundation and say what this particular site of theirs is
            * for — and the block is still 48px tall, so the bar has not grown
            * to hold it.
            *
            * The mark is the tree alone rather than the full artwork, which
            * stacks the tree over "Indic-ai" over a strapline: at the height a
            * bar can spare those lower two lines are unreadable smudges. The
            * full lockup is in the footer, where there is room to read it.
            *
            * alt is empty and the words below it are real text: the link
            * already says the name, and a mark that repeats its own wordmark to
            * a screen reader is announced twice. */}
          <Link to="/" className="brand">
            <img src="/logo-mark.png" alt="" width="36" height="28" className="brand-mark" />
            <span className="brand-name">{t('app.name')}</span>
          </Link>

          {/* Three zones: who this is, where to go, what to do.
           *
           * The bar was a single row of everything — two destinations, two
           * language buttons, a 176px colour select and a sign-in link, all of
           * the same weight, wrapping into three ragged lines on a phone.
           * Grouping fixed the weight; it left the destinations jammed against
           * the brand with a third of the window empty before the controls,
           * which is what still read as unfinished.
           *
           * The middle zone now takes the slack on both sides, so the
           * destinations sit in the centre of the bar and the two edges hold
           * identity and action. Nothing floats. */}
          <nav aria-label="Main" className="nav-main">
            {/* A visitor's first destination, and first in the bar because it is
                first in the flow: check, then find, then apply. A signed-in
                student has the same thing better — their matched list, computed
                from a saved profile — so it is not repeated for them. */}
            {!signedIn && <NavLink to="/check">{t('nav.check')}</NavLink>}
            <NavLink to="/scholarships">{t('nav.find')}</NavLink>
            {signedIn && <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>}
            {signedIn && <NavLink to="/matches">{t('nav.matches')}</NavLink>}
            {signedIn && <NavLink to="/applications">{t('nav.applications')}</NavLink>}
            {signedIn && <NavLink to="/documents">{t('nav.documents')}</NavLink>}
            {/* Last, and only for a visitor. An organisation deciding whether
                to join and a student halfway through an application are not the
                same reader, and the student's four destinations are not worth
                diluting with two that are not theirs. */}
            {!signedIn && <NavLink to="/partner">{t('nav.partner')}</NavLink>}
            {!signedIn && <NavLink to="/impact">{t('nav.impact')}</NavLink>}
          </nav>

          {/* The actions are a child of the bar in their own right, not part of
              the nav group, and that is what lets a phone arrange them: on a
              wide window they read as a cluster at the far edge, and on a
              narrow one they drop to a row of their own at the bottom, nearest
              the thumb. */}
          {signedIn
            ? <AccountMenu onSignOut={signOut} />
            : (
              /* One action, because there is one flow behind it.
                 
                 This was two — an outlined "Login" beside a filled "Register" —
                 and they went to the same screen, because a mobile number and a
                 code do both jobs and an unknown number is registered on the way
                 through. Two doors onto one room is not a richer choice, it is a
                 question the visitor cannot answer: a new student pressed the
                 loud "Register" and arrived at a card headed "Login", and the
                 line below it had to talk them out of the contradiction the
                 heading had just created.
                 
                 So: one button, filled, naming both audiences, and the page it
                 opens repeats the same words back. /register stays alive as a
                 redirect — it is printed on outreach material — but it is no
                 longer a second thing to press. */
              <div className="nav-end">
                <NavLink to="/signin" className="signin">{t('nav.signin')}</NavLink>
              </div>
            )}
        </div>
        </header>
      </div>

      {/* tabIndex -1 so the skip link and the route change above can move focus
          here, which is what makes either do anything for a screen reader
          rather than only scrolling the page. */}
      <main id="main" tabIndex={-1} ref={mainRef}>
        <Outlet />
      </main>

      {showsFooter(location.pathname, signedIn) && <SiteFooter />}
    </>
  )
}

/* The portal's own screens, which end at the last thing on them.
 *
 * The footer belongs to the public site. There it is doing a job — naming the
 * foundation to somebody deciding whether this is a real service, which is the
 * first thing this audience is warned to check. Behind the sign-in that job is
 * already done: the student has an account here, and every screen from the
 * dashboard on is a task. Two hundred words about the organisation and its
 * incubation programme under a list of documents that are expiring is a long
 * scroll past something nobody at that moment is reading, and on a phone it is
 * most of a screen.
 *
 * Mostly by route, because a page that looks different depending on whether a
 * cookie has expired is a page nobody can describe to anybody else. The
 * landing page, the eligibility check and the two organisation pages carry the
 * footer for everyone.
 *
 * /signin keeps its footer. It is the one page where a stranger is being asked
 * for a phone number, and "whose site is this" is exactly the question the
 * footer answers.
 *
 * The scholarship directory is the exception, and it is an exception because
 * the page genuinely does two jobs. To a visitor it is the shop window — the
 * reason to trust the place and the reason to register — and the foundation
 * belongs at the foot of it. To a signed-in student it is where they go to
 * find something to apply for, which is a task like every other task behind
 * the sign-in, and the organisation's own description is not part of it.
 */
const PORTAL = [
  '/dashboard', '/matches', '/applications', '/documents',
  '/profile', '/my-data', '/helpers', '/apply',
]

/* Public until somebody signs in. The scheme pages under it go with the
 * directory: a student reading the criteria of one scholarship is doing the
 * same job as a student scanning the list of them. */
const BROWSE = ['/scholarships']

function under(prefixes: string[], path: string): boolean {
  return prefixes.some(p => path === p || path.startsWith(`${p}/`))
}

function showsFooter(path: string, signedIn: boolean): boolean {
  if (under(PORTAL, path)) return false
  if (signedIn && under(BROWSE, path)) return false
  return true
}

/* Read once at load. A page left open across midnight on 31 December will show
 * last year until it is reloaded, which is not worth a timer. */
const YEAR = new Date().getFullYear()

/* Who runs this.
 *
 * A student handing over a disability certificate and a family income figure is
 * entitled to know whose platform they are on, and a public service with no
 * visible owner reads as a scam — which is the first thing this audience has
 * been warned about. So the foundation is named, and describes itself, at the
 * foot of every page.
 *
 * ---------------------------------------------------------------------------
 * Why there are no links down here
 * ---------------------------------------------------------------------------
 *
 * There were: two columns of destinations and a note about data rights. They
 * came out because every one of those places is in the bar at the top of the
 * page, and a footer that repeats the navigation is a second thing to maintain
 * that says nothing new — the day one of them drifts, the site is telling a
 * student two different stories about where a thing lives.
 *
 * What is left is what only belongs here: who the foundation is, where else to
 * find them, and the notice. The language switch went with the links, for the
 * same reason: it is in the bar, on every page, in the reader's own script.
 */
function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="site-footer">
      <div className="inner">
        <div className="footer-brand">
          <img
            src="/logo-full.png"
            alt="Indic-ai"
            width="150"
            height="130"
            className="footer-logo"
          />

          {/* The funder, under the foundation's own mark and labelled.
            *
            * The label is the load-bearing part. A second logo sitting bare
            * beneath the first reads as a second owner, and "whose platform is
            * this" is the one question this footer exists to answer for
            * somebody about to hand over a disability certificate. "Supported
            * by" says what HSBC is and, just as usefully, what they are not.
            *
            * alt names the bank rather than being empty, which is the opposite
            * of the rule the brand mark above follows: that one sits beside real
            * text saying the same word, and this one does not. It is also not a
            * link — there is no address to send anybody to — so nothing else on
            * the page would announce it.
            *
            * The file is the supplied artwork, unresized and unrecoloured. It is
            * somebody else's trademark: scaling it in CSS is ordinary use, and
            * re-encoding a copy of it into this repository is not ours to do.
            * Lazy, because it is four screens below the fold on a phone. */}
          <p className="footer-sponsor">
            <span className="label">{t('footer.sponsor')}</span>
            <img
              src="/hsbc_logo.png"
              alt="HSBC"
              width="1280"
              height="345"
              loading="lazy"
              decoding="async"
              className="sponsor-logo"
            />
          </p>
        </div>

        {/* The accounts at the far side, level with the top of the logo. */}
        <SocialLinks />

        <div className="footer-end">
          {/* Centred under both, because it belongs to neither: the notice is
              about the whole site rather than about the column above it.

              The year is read from the clock rather than written in, so it
              cannot quietly go stale — a copyright line a year behind is the
              smallest possible signal that nobody is looking after a site, and
              this one asks people for their disability certificates. */}
          <p className="muted">{t('footer.copyright', { year: YEAR })}</p>
        </div>
      </div>
    </footer>
  )
}

/* The foundation's other accounts, drawn from the one list that holds them.
 *
 * Every mark is shown at full strength. One with an address is a link; one
 * without is a picture — the honest rendering of "we are on Facebook, and
 * nobody has put the address in lib/social.ts yet". Guessing the address
 * instead would point a student at somebody else's page.
 *
 * The marks are the brand files as supplied, in colour, so nothing here tries
 * to recolour them. */
function SocialLinks() {
  const { t } = useI18n()

  if (SOCIAL.length === 0) return null

  return (
    <nav className="footer-social" aria-label={t('footer.social')}>
      {SOCIAL.map(s => {
        // Fixed at 24px so the row cannot be moved by a file that happens to
        // be 960px wide, and given both dimensions so the space is held before
        // the file arrives.
        const mark = (alt: string) => (
          <img
            src={s.icon}
            alt={alt}
            width="24"
            height="24"
            loading="lazy"
            decoding="async"
          />
        )

        return s.url
          ? (
            <a key={s.name} href={s.url} rel="noreferrer">
              {mark('')}
              <span className="sr-only">{s.name} — {t('slides.external')}</span>
            </a>
          )
          : <span key={s.name} className="unlinked">{mark(s.name)}</span>
      })}
    </nav>
  )
}

/** The page name for the tab, so several open at once stay distinguishable. */
function titleFor(path: string, t: (key: string) => string): string {
  if (path.startsWith('/check')) return t('nav.check')
  if (path.startsWith('/scholarships')) return t('nav.find')
  if (path.startsWith('/partner')) return t('nav.partner')
  if (path.startsWith('/impact')) return t('nav.impact')
  if (path.startsWith('/dashboard')) return t('nav.dashboard')
  if (path.startsWith('/matches')) return t('nav.matches')
  if (path.startsWith('/applications')) return t('nav.applications')
  if (path.startsWith('/documents')) return t('nav.documents')
  if (path.startsWith('/profile')) return t('nav.profile')
  if (path.startsWith('/my-data')) return t('nav.privacy')
  if (path.startsWith('/helpers')) return t('nav.helpers')
  if (path.startsWith('/register')) return t('nav.register')
  if (path.startsWith('/signin')) return t('nav.signin')
  return t('app.tagline')
}

/* One menu, two uses.
 *
 * A <details> rather than a scripted menu: it is keyboard-operable, announces
 * its own expanded state, and works before JavaScript has loaded on a slow
 * connection. What it does not do on its own is close when you click away or
 * press Escape, so those two are added here and nothing else is.
 *
 * Both the account menu and the visitor's display menu are this component. They
 * held two copies of the same forty lines, which is how one of them ends up
 * without the Escape handler. */
function Menu({
  label, hint, className, children,
}: {
  /** The visible text on the control. */
  label: string
  /** Its accessible name, where the visible label is a shorthand. */
  hint?: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  const location = useLocation()

  // Closed on navigation. Left open, the menu would cover the page the student
  // just asked for.
  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [location.pathname])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const el = ref.current
      if (el?.open && !el.contains(e.target as Node)) el.open = false
    }
    function onKeyDown(e: KeyboardEvent) {
      const el = ref.current
      if (e.key === 'Escape' && el?.open) {
        el.open = false
        // Focus returns to the control that opened it; leaving it on a
        // now-hidden item strands a keyboard user.
        el.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <details className={`menu${className ? ` ${className}` : ''}`} ref={ref}>
      <summary aria-label={hint}>
        {label}
        <span className="caret" aria-hidden="true">▾</span>
      </summary>

      <div className="menu-panel">{children}</div>
    </details>
  )
}

/* Account business, done occasionally: the profile, the data rights screen and
 * the people helping. */
function AccountMenu({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useI18n()

  return (
    <Menu label={t('nav.account')} className="account">
      <>
        <NavLink to="/profile">{t('nav.profile')}</NavLink>
        <NavLink to="/helpers">{t('nav.helpers')}</NavLink>
        <NavLink to="/my-data">{t('nav.privacy')}</NavLink>

        <hr />

        <button className="quiet wide" onClick={onSignOut}>{t('nav.signout')}</button>
      </>
    </Menu>
  )
}

