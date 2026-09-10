/* The API client.
 *
 * One place that knows the base path, one place that knows how a failure is
 * shaped, and one place that decides what to do when a token expires. Every
 * screen calls through here so none of them has to get those three right.
 */

import type { ApiErrorBody, Envelope } from './types'
import { setting } from './runtime-config'

/* Must match API_VERSION on the server; see .env.example.
 *
 * Read at container start rather than baked in, so one image can be pointed at
 * an API on a different version without a rebuild — the same property
 * API_TARGET has always had. 'v1' remains the default because every deployment
 * so far is on it, and a missing value should not produce requests to /api//. */
const VERSION = setting('API_VERSION') || 'v1'
const BASE = `/api/${VERSION}`

/* The address of something the API serves as bytes rather than as JSON — a
 * sponsor's logo, today.
 *
 * The API sends these as paths ("/public/organisations/<id>/logo") rather than
 * as URLs on purpose: the directory response is cached, and an absolute URL
 * would bake one deployment's hostname into it. Joining the base is therefore
 * the client's job, and this is the one place that knows the base.
 *
 * Not routed through get() below: the consumer is an <img src>, which fetches
 * on its own, unauthenticated, and with the browser's cache in front of it —
 * which is exactly right for a public mark the server marks cacheable for a
 * week. */
export function assetUrl(path: string): string {
  return `${BASE}${path}`
}

/** A failure the API described, as against a network or parsing failure. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly fields?: Record<string, string>
  readonly requestId?: string

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fields = body.fields
    this.requestId = body.request_id
  }

  /** True when signing in again is the only way forward. */
  get isAuthFailure() {
    return this.status === 401
  }
}

/** Set by the auth provider. Kept in memory only — see the note in auth.tsx. */
let accessToken: string | null = null
let onAuthLost: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setAuthLostHandler(fn: (() => void) | null) {
  onAuthLost = fn
}

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /** Skips the refresh-and-retry dance. Used by the auth calls themselves. */
  raw?: boolean
}

async function parse(res: Response): Promise<unknown> {
  if (res.status === 204) return null
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    // A non-JSON body from a JSON API means something upstream answered
    // instead — a proxy error page, usually. Surfacing the status is more
    // useful than a parse error.
    throw new ApiError(res.status, {
      code: 'UNEXPECTED_RESPONSE',
      message: `The server returned an unexpected response (${res.status}).`,
    })
  }
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(BASE + path, window.location.origin)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  return url.pathname + url.search
}

async function send<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    // The refresh token is an HttpOnly cookie; without this the browser would
    // not send it and every refresh would fail.
    credentials: 'same-origin',
    signal: opts.signal,
  })

  if (res.ok) return (await parse(res)) as T

  const body = (await parse(res)) as ApiErrorBody | null
  if (body?.error) throw new ApiError(res.status, body.error)

  // No error envelope means this did not come from the API at all — a dev
  // server with no proxy configured, a misrouted path, or something upstream
  // answering first. Naming that is more use than repeating the status code,
  // because the fix is in configuration rather than in the request.
  throw new ApiError(res.status, {
    code: 'NO_API',
    message: res.status === 404
      ? `Nothing is serving the API at ${BASE}. Check that the backend is running `
        + 'and that the dev server is proxying to it.'
      : `The API did not respond properly (${res.status}).`,
  })
}

/* --- refresh ------------------------------------------------------------------
 *
 * Access tokens last fifteen minutes, so an operator reading an audit log will
 * hit an expiry mid-session. One refresh is attempted transparently and the
 * original request replayed; a second failure hands control to the auth
 * provider, which signs out.
 *
 * The in-flight promise is shared so that five widgets refreshing at once
 * produce one refresh, not five — the server rotates the refresh token on every
 * use and treats a replayed one as theft, revoking the whole family. Racing
 * refreshes would sign the operator out for no reason. */

let refreshing: Promise<unknown | null> | null = null

/* Every refresh in this application, deduped.
 *
 * Sharing the in-flight promise is not an optimisation, it is the difference
 * between staying signed in and being thrown out. The server rotates the
 * refresh token on every use and treats an already-rotated one as replay —
 * identity.Refresh revokes the whole family and denylists every token the
 * account holds, because a replay is either a race or a theft and it cannot
 * tell which.
 *
 * So two refreshes with the same cookie end the session. The retry path below
 * has always shared this promise; the session bootstrap and refreshProfile in
 * auth.tsx did not — they called /auth/refresh directly. React's StrictMode
 * runs an effect twice in development, and a profile save triggers a refresh
 * that can land beside one, either of which is two refreshes with one cookie.
 *
 * Returns the whole envelope rather than the token, because the callers need
 * the account and its contexts too.
 */
export async function refreshSession<T>(): Promise<T | null> {
  refreshing ??= (async () => {
    try {
      const res = await send<Envelope<{ token: { access_token: string } }>>(
        '/auth/refresh', { method: 'POST', raw: true },
      )
      setAccessToken(res.data.token.access_token)
      return res
    } catch {
      return null
    } finally {
      // Cleared on the next tick so concurrent callers all observe the same
      // settled promise before it is discarded.
      queueMicrotask(() => { refreshing = null })
    }
  })()

  return refreshing as Promise<T | null>
}

async function refresh(): Promise<string | null> {
  const res = await refreshSession<Envelope<{ token: { access_token: string } }>>()
  return res ? res.data.token.access_token : null
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, opts)
  } catch (err) {
    if (!(err instanceof ApiError) || !err.isAuthFailure || opts.raw) throw err

    const token = await refresh()
    if (!token) {
      onAuthLost?.()
      throw err
    }
    return send<T>(path, opts)
  }
}

/** Unwraps the standard envelope. */
export async function get<T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) {
  const res = await request<Envelope<T>>(path, { query, signal })
  return res
}

export async function post<T>(path: string, body?: unknown) {
  return request<Envelope<T>>(path, { method: 'POST', body })
}

export async function del<T>(path: string, body?: unknown) {
  return request<Envelope<T> | null>(path, { method: 'DELETE', body })
}

/* Multipart upload.
 *
 * Separate from send() because the Content-Type must be left unset: the browser
 * generates a multipart boundary and writes the header itself, and forcing
 * application/json — or even multipart/form-data without the boundary — makes
 * the body unparseable at the other end.
 */
export async function upload<T>(path: string, form: FormData): Promise<Envelope<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: form,
    credentials: 'same-origin',
  })

  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (res.ok) return body as Envelope<T>

  throw new ApiError(res.status, body?.error ?? {
    code: 'UPLOAD_FAILED',
    message: 'We could not upload that file.',
  })
}

/** Login bypasses the refresh path: there is no session to refresh yet. */
export async function login(body: unknown) {
  return request<Envelope<import('./types').LoginResult>>('/auth/login', {
    method: 'POST', body, raw: true,
  })
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST', raw: true })
  } catch {
    // A failed sign-out must still clear local state, or the operator is stuck
    // looking at a session they believe they have ended.
  }
}

/* A file the API generates, fetched with the session and handed to the browser.
 *
 * A plain `<a href>` cannot do this and the reason is worth stating, because it
 * is invisible until it fails: this API authenticates with a bearer token held
 * in memory, not a cookie. A navigation carries no Authorization header, so a
 * link to a protected endpoint answers 401 — and it does so in a way that looks
 * like nothing happened, since the browser has already left the page by then.
 * A signed object-store URL is what the vault uses to avoid this for a stored
 * document, and it is not available for a file assembled per request.
 *
 * Ported from the admin panel's own download(), deliberately unchanged in shape
 * so the two behave the same way, including the parts that are not obvious:
 *
 *   - The filename comes from Content-Disposition. The server names the file;
 *     one invented here would drift from it the first time either side changed.
 *   - A failure is parsed as the API's own error envelope rather than reduced to
 *     a status code. The refusals that actually happen are worth reading — "those
 *     documents come to 63 MB together" tells a student what to do next, and
 *     "the server returned 413" does not.
 *   - One retry after a refresh. A student who has had the scheme page open for
 *     an hour has an expired access token, and the download is the press that
 *     discovers it; failing that press would look like the file being broken.
 *
 * The anchor is created, clicked and removed rather than assigning
 * location.href, because a navigation would tear down the page while the
 * download starts. The object URL is revoked on the next tick: revoking it
 * synchronously races the browser's own read of it, and Safari loses the
 * download about half the time.
 */
export async function download(path: string, query?: RequestOptions['query']) {
  const url = buildUrl(path, query)

  const fetchIt = () => fetch(url, {
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    credentials: 'same-origin',
  })

  let res = await fetchIt()

  if (res.status === 401) {
    const token = await refresh()
    if (!token) {
      onAuthLost?.()
      throw new ApiError(401, { code: 'UNAUTHENTICATED', message: 'Sign in again.' })
    }
    res = await fetchIt()
  }

  if (!res.ok) {
    const body = (await parse(res)) as ApiErrorBody | null
    if (body?.error) throw new ApiError(res.status, body.error)
    throw new ApiError(res.status, {
      code: 'DOWNLOAD_FAILED',
      message: `The file could not be prepared (${res.status}).`,
    })
  }

  const objectURL = URL.createObjectURL(await res.blob())

  const a = document.createElement('a')
  a.href = objectURL
  a.download = filenameFrom(res.headers.get('Content-Disposition')) ?? 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()

  setTimeout(() => URL.revokeObjectURL(objectURL), 0)
}

/* The filename out of a Content-Disposition header.
 *
 * Only the quoted `filename="…"` form, which is what this API sends and all it
 * needs to parse. RFC 5987's `filename*=UTF-8''…` is deliberately not handled:
 * nothing here generates one — the bundle handler keeps the scheme's title out
 * of the header for exactly that reason — and half-implementing it would mean
 * guessing at an encoding rather than falling back to a name that works.
 *
 * The result is stripped of anything path-like. It comes from a response header
 * rather than from a user, so it is not attacker-controlled in any ordinary
 * sense, but a download attribute holding "../" is a category of bug worth
 * simply not having.
 */
function filenameFrom(header: string | null): string | null {
  const match = header?.match(/filename="([^"]+)"/)
  if (!match) return null
  const name = match[1].replace(/[/\\]/g, '_').trim()
  return name === '' || name === '.' || name === '..' ? null : name
}
