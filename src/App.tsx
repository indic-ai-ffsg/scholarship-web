import { lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { useAuth } from './lib/auth-context'
import { withNext } from './lib/next'
import { usePageVisit } from './lib/visit'
import { usePageAnalytics } from './lib/analytics'
import Layout from './components/Layout'
import { Loading } from './components/ui'
/* Eager: the three screens somebody arrives on.
 *
 * A lazy route costs a second round trip — the main chunk has to arrive before
 * the browser learns which page chunk to ask for — and paying that on the page
 * the visitor actually landed on would trade one problem for a smaller copy of
 * itself. These are the entry points: the landing page, the door, and the
 * redirect printed on outreach material. Everything else is reached by a press
 * on a page that is already up, where the fetch overlaps with reading. */
import Home from './pages/public/Home'
import CustomPage from './pages/public/Page'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import NotFound from './pages/NotFound'

/* Everything else, as its own chunk.
 *
 * The whole portal used to be one 456 KB file: a visitor reading the landing
 * page downloaded the application wizard, the document vault, the grievance
 * screens and the data-rights page before anything rendered. Nobody sees more
 * than a handful of these in a session, and a student who never applies sees
 * none of them. */
const Directory = lazy(() => import('./pages/public/Directory'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Matches = lazy(() => import('./pages/Matches'))
const Documents = lazy(() => import('./pages/Documents'))
const Applications = lazy(() => import('./pages/Applications'))
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'))
const Apply = lazy(() => import('./pages/Apply'))
const Profile = lazy(() => import('./pages/Profile'))
const MyData = lazy(() => import('./pages/MyData'))

export default function App() {
  /* Nothing waits for the session any more.
   *
   * This used to render a spinner over the whole application until
   * POST /auth/refresh came back — for everybody, including a first-time
   * visitor on the landing page who has no cookie to refresh and is not
   * signing in. The public site's first paint was therefore an API round trip
   * away, with no timeout on it: when the API was slow the site showed
   * "Loading…" for as long as the browser would wait, and that is where the
   * five seconds were.
   *
   * What the gate was protecting is real and is kept, in the two places that
   * actually need it: the guards below hold a portal page rather than bouncing
   * a signed-in student to the sign-in screen, and the masthead holds its
   * account controls rather than flashing "Login" at somebody who is already
   * logged in. Everything else renders immediately and finds out about the
   * session when the answer arrives. */
  /* One line, and the platform can finally answer "how many visitors".
   *
   * Mounted here rather than per page so no route has to remember it, and above
   * the guards so a visitor is counted on the page they actually landed on. It
   * counts public routes only and sends no identifier of any kind — see
   * lib/visit.ts, which carries the reasoning and the reason there is still no
   * consent banner on this site. */
  usePageVisit()
  // Google Analytics, every route — see lib/analytics.ts.
  usePageAnalytics()

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public. No authentication anywhere in this group (FR-17). */}
        {/* A landing page rather than a redirect. "/" was sending everybody
            straight to the directory, which answers "what is on offer" without
            ever answering "is any of this for me" — the question Table 4.1
            gives the public site. */}
        <Route index element={<Home />} />
        {/* /check is gone, and the address is kept alive rather than left to
            the catch-all.
            *
            * The page asked a visitor the same questions the registration form
            now asks, saved none of them, and handed them on as a draft to be
            typed again — two forms over one vocabulary, and only the second
            could keep an answer. Every link to it inside the app now points at
            /register.
            *
            * The ones outside the app cannot be updated. This was the filled
            * button in the masthead of every public page for months, so it is
            * in browser histories and in anything anybody shared; letting it
            * fall through to the catch-all would answer a bookmark with a page
            * that does not exist. Same reasoning as /profile/setup below and
            * /register itself — an address the product has published is a
            * promise the product keeps. */}
        <Route path="/check" element={<Navigate to="/register" replace />} />
        <Route path="/scholarships" element={<Directory />} />
        {/* Two pages the platform had the endpoints for and no way into:
            organisations could not apply to join at all, and nothing published
            what the platform is carrying. */}
        {/* The scheme is a panel over the list, at this address as well as at
            ?scheme=. It was a page of its own; the panel replaced it, and the
            path is kept rather than redirected because it is the address
            already in circulation — forwarded by counsellors, indexed, and
            produced by "copy link address" on every row. Same component, so a
            sent link and a pressed row now give the same thing. */}
        <Route path="/scholarships/:slug" element={<Directory />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signin" element={<SignIn />} />

        {/* The student's own. */}
        <Route path="/dashboard" element={<RequireProfile><Dashboard /></RequireProfile>} />
        {/* /profile is the review — everything the student has told us, read
            only. The form that writes it is /register, which is the same form
            whether it is being filled for the first time or re-opened with
            ?edit to change one answer. One form rather than two is why the
            eleven-screen wizard and its per-field twin on the review screen
            both went; see the header of pages/Register.
            *
            * /profile/setup stays alive as a redirect. It is in browser
            * histories and in the "finish your profile" links of every email
            * sent before this changed. */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/profile/setup" element={<Navigate to="/register?edit" replace />} />
        <Route path="/matches" element={<RequireProfile><Matches /></RequireProfile>} />
        <Route path="/documents" element={<RequireProfile><Documents /></RequireProfile>} />
        <Route path="/apply/:scholarshipId" element={<RequireProfile><Apply /></RequireProfile>} />
        <Route path="/applications" element={<RequireProfile><Applications /></RequireProfile>} />
        <Route path="/applications/:applicationId" element={<RequireProfile><ApplicationDetail /></RequireProfile>} />
        <Route path="/my-data" element={<RequireProfile><MyData /></RequireProfile>} />
        {/* Reachable by somebody who holds no student profile at all: a parent
            with an account and nothing in it still has invitations to answer. */}

        {/* Pages written in the admin panel (backend migration 0042).
            *
            * Second to last, and the order is load-bearing: this matches
            * anything, so above any route here it would swallow it. The server
            * refuses to save a page whose address collides with a compiled
            * route — both guards, because either alone leaves a page that saves
            * successfully and can never be seen. */}
        <Route path="/*" element={<CustomPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

/* Registered is not the same as finished.
 *
 * Verifying a code creates an account; it does not create a student. Somebody
 * who abandons the registration form has an account with nothing in it, and the
 * dashboard, the matches and the application pages all describe a student who
 * does not exist yet — so they are sent back to finish rather than shown empty
 * versions of each.
 *
 * This is the guard whether they left a minute ago or a month ago: the same
 * redirect catches the fresh registration that never completed and the return
 * visit that follows it, because both present the same state.
 *
 * The attempted destination travels along, so finishing hands them onward to
 * where they were going instead of dropping them at a default.
 */
function RequireProfile({ children }: { children: React.ReactNode }) {
  const { status, profile } = useAuth()
  const location = useLocation()

  // Still asking. Redirecting here would throw a signed-in student out to the
  // sign-in page every time they reloaded a portal page.
  if (status === 'loading') return <div className="page"><Loading /></div>
  /* The destination travels on this branch too, and it did not.
   *
   * The paragraph above this function says it does, and the !profile branch
   * below has always carried it — but a signed-OUT visitor was sent to a bare
   * /signin, so signing in landed them on the dashboard with no way back to
   * what they had pressed. That was mostly invisible while the only route in
   * was the scheme page, whose own Apply button is drawn for signed-in readers
   * only. The directory's rows now offer Apply to everybody, which is the
   * point of them, and this is the path that press takes. */
  if (status !== 'authenticated') {
    return <Navigate to={withNext('/signin', location.pathname + location.search)} replace />
  }
  if (!profile) {
    return <Navigate to={withNext('/register', location.pathname + location.search)} replace />
  }
  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <div className="page"><Loading /></div>
  // Sent to register rather than sign-in: somebody reaching a student page
  // without an account is far more likely not to have one than to have
  // forgotten they are signed out.
  if (status !== 'authenticated') return <Navigate to="/register" replace />
  return <>{children}</>
}
