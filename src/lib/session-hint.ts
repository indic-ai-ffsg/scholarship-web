/* Whether this browser had a session the last time the page was open.
 *
 * A hint, and only ever used as one: the masthead reads it for the half-second
 * between the page loading and POST /auth/refresh answering, to decide which
 * set of destinations to draw while it waits. Without it the bar drew the
 * visitor's — Scholarships, How it works, Register, Login — on every load of
 * every page a signed-in student opened, and swapped them for Dashboard and My
 * matches a moment later: the whole bar changing under the reader, once per
 * navigation that reloaded the page.
 *
 * It grants nothing. The route guards wait for the real answer; a link drawn
 * from the hint leads to a guarded page that does the same. If the hint is
 * wrong — the session expired while the tab was closed — the bar shows the
 * student's links for that half-second and then the visitor's, which is the
 * same swap as before, in the rarer direction.
 *
 * One flag, no identifier: nothing here says who, only that somebody was. The
 * session itself is an HttpOnly cookie this code cannot read, which is the
 * point of it. Every access is guarded, because storage throws in some private
 * windows and when site data is blocked — and a hint that cannot be read is
 * simply absent, which is the old behaviour.
 */
const KEY = 'sp.hadSession'

export function hadSession(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function rememberSession(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Unwritable storage: the hint is absent, and the bar waits as it used to.
  }
}
