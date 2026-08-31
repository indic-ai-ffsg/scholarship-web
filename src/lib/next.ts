/* Where to go afterwards.
 *
 * The public site now answers "do I qualify?" before it asks for an account,
 * which means somebody presses Apply on a scheme while they are still a visitor.
 * That request has to survive registration — the form, the verification code,
 * the wait for the code to arrive, the profile they then have to fill in — and
 * put them back on the scholarship they were looking at. Landing them on a
 * dashboard to find it again is how the answer they came for gets lost.
 *
 * It travels in the address rather than in state, for the same reason the
 * directory's filters do: it survives a reload, a shared link and the back
 * button, none of which component state does.
 *
 * Which makes it attacker-controlled input. A `next` naming another origin would
 * turn this site's own sign-in form into somebody else's phishing page — the
 * visitor checks the address bar, sees the site they trust, signs in, and is
 * handed to whatever the link chose. So nothing but a path on this origin is
 * ever returned, and the fallback is used in every doubtful case rather than
 * some best-effort repair of the value.
 */

/* Where a signed-in student belongs when nothing more specific was asked for.
 *
 * The dashboard rather than the matched list: it is the screen both branches of
 * the sign-in flow converge on, and it says what is waiting on the student
 * before it says what they could apply for. Somebody who arrived by pressing
 * Apply on the public eligibility check still goes to that scholarship, because
 * a `next` was carried and overrides this. */
const FALLBACK = '/dashboard'

/** Reads a safe internal destination out of a location's query string. */
export function safeNext(search: string | URLSearchParams, fallback = FALLBACK): string {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const raw = params.get('next')
  return isInternalPath(raw) ? raw : fallback
}

/** Adds `next` to a path, when there is one worth carrying. */
export function withNext(path: string, next?: string | null): string {
  if (!isInternalPath(next)) return path
  return `${path}?next=${encodeURIComponent(next)}`
}

function isInternalPath(path: string | null | undefined): path is string {
  if (!path) return false

  // Exactly one leading slash: "//evil.example" is a protocol-relative URL that
  // leaves the site while looking like a path.
  if (!path.startsWith('/') || path.startsWith('//')) return false

  // No traversal, no whitespace, and no backslash — several browsers read
  // "/\evil.example" as protocol-relative too — nor anything else that could
  // break out of the attribute this value is written into.
  return !/[\s<>"'\\]|^\/+\.\./.test(path)
}
