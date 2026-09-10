/* Which door the Apply button opens.
 *
 * One function, because there are four buttons and they were each deciding for
 * themselves. The directory card, the scheme panel, the scheme page and the
 * matched list all render an Apply control, and every one of them had its own
 * copy of the test — three of them read `listing_kind === 'CURATED' &&
 * external_url`, and the matched list had no test at all and always linked to
 * `/apply/:id`.
 *
 * That divergence is the bug, not a tidiness complaint. A student who found a
 * scheme through their matches got the internal form for a scheme applied for
 * off-site; the same scheme reached from the directory sent them to the
 * sponsor. The two screens disagreed about the same row, and the one that was
 * wrong was the personalised one — the screen a student trusts most, because it
 * is about them.
 *
 * # The field to branch on is apply_mode
 *
 * Backend 0054 split apart two facts that used to be one column:
 *
 *   listing_kind  TENANT or CURATED — whether we hold an account for the
 *                 sponsor. It is about our contracts.
 *   apply_mode    INTERNAL or EXTERNAL — where the student ends up. It is about
 *                 this press.
 *
 * They coincided while a curated listing was the only thing applied for
 * elsewhere. They do not now: an approved organisation, on the platform, with a
 * logo and a contact, may take applications on the portal it has run for nine
 * years. Reading the kind for that scheme sends the student to a form its
 * sponsor will never read, and the application sits here looking submitted.
 *
 * So apply_mode decides the destination and listing_kind only decides which
 * sentence to write underneath — "they take it on their own site" for a sponsor
 * who is here, "we list this so you can find it" for one who is not. Saying the
 * second about an organisation that has an account is both wrong and rude.
 */

/** The two shapes the payloads have in common, which is all this needs. */
export interface Appliable {
  scholarship_id: string
  apply_mode?: 'INTERNAL' | 'EXTERNAL'
  external_url?: string
  listing_kind?: 'TENANT' | 'CURATED'
}

export type ApplyRoute =
  /** The application is made here. `to` is a router path. */
  | { kind: 'internal'; to: string }
  /** The application is made on the sponsor's site. `href` leaves. */
  | { kind: 'external'; href: string; sponsorIsOnPlatform: boolean }

/* applyRoute answers where a press should go.
 *
 * The fallbacks are the interesting part, and they lean one way on purpose.
 *
 * An absent apply_mode means an older or cached response — a directory page is
 * held in Redis for five minutes, and the backend versioned that key for
 * exactly this reason, but a service worker or a browser cache is not something
 * this code can version. Absent falls back to INTERNAL, which is the column's
 * own default and the safe way to be wrong: an internal press that should have
 * been external lands on the Apply screen, which re-checks with the server and
 * says where to go. The reverse would send somebody off the platform on the
 * strength of a stale payload.
 *
 * EXTERNAL with no external_url cannot happen — scholarship_apply_destination
 * makes the column NOT NULL for those rows — but it is handled rather than
 * asserted, and it falls back to internal for the same reason. A button that
 * opens `about:blank` is worse than one that opens a screen able to explain
 * itself.
 */
export function applyRoute(s: Appliable): ApplyRoute {
  const internal: ApplyRoute = { kind: 'internal', to: `/apply/${s.scholarship_id}` }

  if (s.apply_mode !== 'EXTERNAL') return internal
  if (!s.external_url) return internal

  return {
    kind: 'external',
    href: s.external_url,
    sponsorIsOnPlatform: (s.listing_kind ?? 'CURATED') === 'TENANT',
  }
}

/* Which sentence explains an off-site press.
 *
 * Kept beside applyRoute so the two cannot drift, and returned as a key rather
 * than a string because the caller owns the interpolation — every one of these
 * names the sponsor, and only the caller has it.
 *
 * `?? 'CURATED'` in applyRoute above is the conservative default here too: the
 * curated sentence is true of any sponsor who takes applications elsewhere,
 * while the tenant one claims a relationship. Being vague about a partner is
 * recoverable; claiming one that does not exist is not.
 */
export function externalHelpKey(route: ApplyRoute): string {
  if (route.kind !== 'external') return ''
  return route.sponsorIsOnPlatform
    ? 'public.applyExternalHelpPartner'
    : 'public.applyExternalHelp'
}
