import * as api from './api'

/* Recording that we sent a student to a scheme's own site.
 *
 * # Why it is fire-and-forget
 *
 * The press this hangs off opens a new tab. Awaiting the request before letting
 * that happen would put a round trip between a student's finger and the page
 * they asked for — and on the connection this platform is built for, that is
 * the difference between a link that works and one that seems broken. So the
 * request goes and nobody waits for it.
 *
 * The failure that buys is acceptable in the only direction it can fail: a
 * referral that does not record means the connector under-counts itself. A
 * referral that delayed or blocked the redirect would mean a student who did
 * not reach the scheme at all, which is the platform failing at the one thing
 * it claims to do.
 *
 * # Why the error is swallowed
 *
 * Nothing the student can act on. They pressed Apply and the sponsor's site
 * opened; a red box about a tracking call they never asked for would be the
 * platform reporting its own bookkeeping as their problem. It goes to the
 * console, where it is a developer's to find.
 *
 * # Why it is not sendBeacon
 *
 * sendBeacon is the right tool for a page being unloaded and the wrong one
 * here: it cannot carry the Authorization header, and this endpoint is the
 * student's own. The tab that opens is a new one, so this page is not going
 * anywhere and an ordinary fetch completes normally.
 */
export function recordReferral(scholarshipID: string) {
  void api.post('/me/referrals', { scholarship_id: scholarshipID })
    .catch(err => {
      // Not surfaced: see above. Logged so it is findable.
      console.warn('referral not recorded', scholarshipID, err)
    })
}
