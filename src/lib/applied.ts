import { useEffect, useState } from 'react'

import * as api from './api'
import type { Application } from './types'

/* Which schemes this student has already applied to.
 *
 * # One source of truth, and it is the application record
 *
 * The matched list has had this since it was built: the matcher's own query
 * joins `application` and returns `already_applied`, so a scheme the student
 * has applied for shows "Applied" and a link to it rather than an Apply button.
 *
 * The directory could not, and the reason is worth stating because it rules out
 * the obvious fix. The directory is served from `public_scholarship` to
 * anonymous readers and held in Redis for five minutes — a shared cache. Adding
 * a per-reader field to it would mean either caching one reader's applications
 * and serving them to the next, or giving up the cache that makes the public
 * site fast. Neither is acceptable, and "already applied" is not a property of
 * a scholarship anyway; it is a property of the pair.
 *
 * So the page asks the same question the matched list does, of the same table,
 * through the student's own endpoint: GET /me/applications. Same record, same
 * answer, no second notion of "applied" stored anywhere.
 *
 * # Fetched once for the whole page
 *
 * A directory row is a component, and a hook that fetched inside each one would
 * issue forty identical requests for a list of forty. The promise is held at
 * module level and shared, exactly as api.refreshSession shares its own — so
 * forty cards mounting together produce one request, and a row mounting later
 * reads what is already there.
 *
 * # It can be wrong in only one direction
 *
 * Before the answer arrives, `applicationFor` returns undefined and a row draws
 * Apply. That is the safe way round: pressing Apply on something already applied
 * for lands on the apply screen, which re-checks with the server and says so —
 * the database's partial unique index makes a duplicate impossible regardless.
 * The reverse, hiding Apply from somebody who has not applied, would be a
 * scheme they simply could not reach.
 */

let cache: Map<string, string> | null = null
let inFlight: Promise<Map<string, string>> | null = null

/* The listeners are how a fetch that finishes after a card mounted still
   reaches it. A Set rather than an array so an unmount cannot remove the wrong
   one when two rows registered the same function. */
const listeners = new Set<() => void>()

function load(): Promise<Map<string, string>> {
  if (cache) return Promise.resolve(cache)

  inFlight ??= api.get<Application[]>('/me/applications', { page_size: 200 })
    .then(res => {
      const map = new Map<string, string>()
      for (const a of res.data ?? []) {
        /* Keyed on the scheme, holding the application. The first wins: the API
         * returns newest first, and a student who applied, was refused and
         * applied again in a later cycle should be sent to the live one rather
         * than to the history. */
        if (a.scholarship_id && !map.has(a.scholarship_id)) {
          map.set(a.scholarship_id, a.application_id)
        }
      }
      cache = map
      listeners.forEach(fn => fn())
      return map
    })
    .catch(() => {
      /* A failure is not an error anybody should see. The worst it costs is an
       * Apply button on something already applied for, which the apply screen
       * then explains — so it is swallowed rather than turned into a red box
       * over a directory the reader came to browse. */
      cache = new Map()
      listeners.forEach(fn => fn())
      return cache
    })
    .finally(() => { inFlight = null })

  return inFlight
}

/** Drops the cache, so the next reader re-asks. Called after applying. */
export function forgetApplied() {
  cache = null
  inFlight = null
  listeners.forEach(fn => fn())
}

/* useApplied answers "has this student applied for that scheme".
 *
 * `enabled` is the signed-in test, passed by the caller rather than read here:
 * this hook is used by the public directory, which anonymous visitors see, and
 * asking /me/applications without a session is a guaranteed 401 in everybody's
 * network tab and a denied-access line in the audit log for doing nothing
 * wrong.
 */
export function useApplied(enabled: boolean) {
  const [, bump] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const fn = () => bump(n => n + 1)
    listeners.add(fn)
    void load()
    return () => { listeners.delete(fn) }
  }, [enabled])

  return {
    /** The application's id when one exists, else undefined. */
    applicationFor: (scholarshipID: string): string | undefined =>
      enabled ? cache?.get(scholarshipID) : undefined,
  }
}
