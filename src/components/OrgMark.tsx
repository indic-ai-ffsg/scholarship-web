import { useState } from 'react'

/* The sponsor's mark beside an application, with a monogram behind it.
 *
 * # Why not the SponsorLogo component
 *
 * That one takes a listing carrying logo_url and the stored dimensions, and
 * renders nothing when there is none. An application payload has an
 * organisation_id and a name and no logo fields at all — the bytes are at
 * /public/organisations/<id>/logo, which either answers or 404s.
 *
 * Adding has_logo to the application payload would be the tidier fix and it is
 * three joins and a migration's worth of plumbing for a picture. The monogram
 * below makes the request's failure a non-event instead, which is the same
 * outcome for less.
 *
 * # The monogram is the floor, not the fallback
 *
 * It is rendered first and always, and the image sits over it. So a sponsor
 * with no logo gets a deliberate mark rather than a gap, a slow connection
 * shows initials until the bytes land instead of a jumping row, and a 404 —
 * which is the ordinary case for an organisation nobody has uploaded one for —
 * simply leaves what was already there. No flicker, no broken-image glyph, no
 * layout shift, because the box is a fixed square either way.
 *
 * Both are aria-hidden. The organisation's name is written beside this in the
 * card; a screen reader announcing "Indic AI logo, Indic AI" is the duplication
 * that makes people turn images off.
 */
export default function OrgMark({ organisationID, name }: {
  organisationID?: string
  name?: string
}) {
  const [failed, setFailed] = useState(false)

  return (
    <span className="org-mark" aria-hidden="true">
      <span className="org-mark-initials">{initials(name)}</span>

      {organisationID && !failed && (
        <img
          src={`/api/v1/public/organisations/${organisationID}/logo`}
          alt=""
          onError={() => setFailed(true)}
          /* Off the critical path: a list of applications is read for its
             words, and on a metered connection the marks should not compete
             with them. */
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  )
}

/* Up to two initials from the sponsor's name.
 *
 * Words rather than characters, so "Indic AI" gives IA and not In. Filtered for
 * emptiness because a name typed with a double space would otherwise contribute
 * a blank initial and produce a one-letter monogram beside two-letter ones.
 *
 * Falls back to a bullet rather than a letter: an empty square reads as a
 * failed image, and a guessed letter would be wrong about somebody's name.
 */
function initials(name?: string): string {
  const words = (name ?? '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return '•'
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
