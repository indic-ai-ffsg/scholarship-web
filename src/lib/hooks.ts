import { useCallback, useEffect, useState } from 'react'

export interface QueryMeta {
  page: number
  page_size: number
  total: number
  has_more: boolean
}

export interface Query<T> {
  data: T | null
  meta: QueryMeta | null
  /** A request for the current dependencies is in flight. */
  loading: boolean
  /** What `data` holds was fetched for an earlier set of dependencies. */
  stale: boolean
  error: unknown
  reload: () => void
}

/* A deliberately small data hook rather than a query library. The panel makes a
 * dozen distinct calls; a cache layer would be more configuration than code.
 *
 * `loading` is derived from whether the stored result belongs to the current
 * set of dependencies, rather than being set at the top of the effect. Both
 * produce the same behaviour, but setting state synchronously inside an effect
 * schedules a second render before the first has painted, and React's lint
 * rules flag it for that reason. Deriving it costs nothing and keeps a stale
 * result from being shown for a frame after the filters change.
 */
export function useQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<{ data: T; meta?: QueryMeta | null }>,
  deps: unknown[],
): Query<T> {
  const [nonce, setNonce] = useState(0)
  // Dependencies are filter values — strings and numbers — so serialising them
  // is a sound identity for "this is the same request".
  const key = `${JSON.stringify(deps)}|${nonce}`

  const [result, setResult] = useState<{
    key: string
    data: T | null
    meta: QueryMeta | null
    error: unknown
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetcher(controller.signal)
      .then(res => {
        if (controller.signal.aborted) return
        setResult({ key, data: res.data, meta: res.meta ?? null, error: null })
      })
      .catch(err => {
        // An abort is a navigation, not a failure. Reporting it would flash an
        // error panel every time somebody changes a filter.
        if (controller.signal.aborted || err?.name === 'AbortError') return
        setResult({ key, data: null, meta: null, error: err })
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fresh = result?.key === key
  const reload = useCallback(() => setNonce(n => n + 1), [])

  return {
    // The previous answer is held while the next is fetched, and reported as
    // stale. Discarding it empties the public directory on every keystroke of
    // a search — which for somebody who arrived from a printed notice to find
    // out whether help exists reads as "nothing found", repeatedly, while they
    // are still typing. The caller keeps the results up and marks the region
    // busy instead.
    data: result?.data ?? null,
    meta: result?.meta ?? null,
    loading: !fresh,
    stale: !fresh && result !== null && result.error == null,
    error: fresh ? result.error : null,
    reload,
  }
}

/** Delays a rapidly-changing value — a search box, typically. */
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])

  return debounced
}

/* Whether the reader has asked their device for less movement.
 *
 * Read as a hook rather than left to CSS because the setting governs more than
 * animation here: it decides whether the announcement band rotates at all. A
 * media query can stop a transition, but it cannot stop a timer, and content
 * that replaces itself every eight seconds is exactly what somebody setting
 * this was asking not to happen.
 *
 * Subscribed rather than read once: it can be changed while the page is open,
 * and a reader who turns it on mid-visit means it now.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)

    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}
