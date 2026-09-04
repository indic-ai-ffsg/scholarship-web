import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { useAuth } from './lib/auth-context'
import { withNext } from './lib/next'
import { useI18n } from './lib/i18n-context'
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
import SignIn from './pages/SignIn'
import Register from './pages/Register'

/* Everything else, as its own chunk.
 *
 * The whole portal used to be one 456 KB file: a visitor reading the landing
 * page downloaded the application wizard, the document vault, the grievance
 * screens and the data-rights page before anything rendered. Nobody sees more
 * than a handful of these in a session, and a student who never applies sees
 * none of them. */
const Check = lazy(() => import('./pages/public/Check'))
const Directory = lazy(() => import('./pages/public/Directory'))
const Scheme = lazy(() => import('./pages/public/Scheme'))
const Partner = lazy(() => import('./pages/public/Partner'))
const Impact = lazy(() => import('./pages/public/Impact'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Matches = lazy(() => import('./pages/Matches'))
const Documents = lazy(() => import('./pages/Documents'))
const Applications = lazy(() => import('./pages/Applications'))
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'))
const Apply = lazy(() => import('./pages/Apply'))
const ProfileWizard = lazy(() => import('./pages/ProfileWizard'))
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
  return (
    <Suspense fallback={<div className="page"><Loading /></div>}>
    <Routes>
      <Route element={<Layout />}>
        {/* Public. No authentication anywhere in this group (FR-17). */}
        {/* A landing page rather than a redirect. "/" was sending everybody
            straight to the directory, which answers "what is on offer" without
            ever answering "is any of this for me" — the question Table 4.1
            gives the public site. */}
        <Route index element={<Home />} />
        {/* The first step of the flow: an eligibility answer before an account.
            Public on purpose — the whole value of it is that it precedes
            registration. */}
        <Route path="/check" element={<Check />} />
        <Route path="/scholarships" element={<Directory />} />
        {/* Two pages the platform had the endpoints for and no way into:
            organisations could not apply to join at all, and nothing published
            what the platform is carrying. */}
        <Route path="/partner" element={<Partner />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/scholarships/:slug" element={<Scheme />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signin" element={<SignIn />} />

        {/* The student's own. */}
        <Route path="/dashboard" element={<RequireProfile><Dashboard /></RequireProfile>} />
        {/* Two screens, and which one you get depends on whether you have
            finished rather than on which link you pressed. /profile is the
            review; the questions live at /profile/setup, because
            "Question 1 of 11" is the right thing to show somebody exactly once
            and the wrong thing to show them ever after. */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/profile/setup" element={<RequireAuth><ProfileWizard /></RequireAuth>} />
        <Route path="/matches" element={<RequireProfile><Matches /></RequireProfile>} />
        <Route path="/documents" element={<RequireProfile><Documents /></RequireProfile>} />
        <Route path="/apply/:scholarshipId" element={<RequireProfile><Apply /></RequireProfile>} />
        <Route path="/applications" element={<RequireProfile><Applications /></RequireProfile>} />
        <Route path="/applications/:applicationId" element={<RequireProfile><ApplicationDetail /></RequireProfile>} />
        <Route path="/my-data" element={<RequireProfile><MyData /></RequireProfile>} />
        {/* Reachable by somebody who holds no student profile at all: a parent
            with an account and nothing in it still has invitations to answer. */}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

/* Registered is not the same as finished.
 *
 * Verifying a code creates an account; it does not create a student. Somebody
 * who abandons the details wizard has an account with nothing in it, and the
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
  if (status !== 'authenticated') return <Navigate to="/signin" replace />
  if (!profile) {
    return <Navigate to={withNext('/profile/setup', location.pathname + location.search)} replace />
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

function NotFound() {
  const { t } = useI18n()
  return (
    <div className="page narrow">
      <h1>404</h1>
      <p><a href="/scholarships">{t('public.back')}</a></p>
    </div>
  )
}
