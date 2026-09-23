import { useEffect, useState } from 'react'

import { initials, photoURL } from '../lib/avatar'

/* The student's avatar: the photograph they uploaded, over their initials.
 *
 * The photograph is already in their vault — the Photograph document type on
 * My documents — so the account menu and the profile show it rather than
 * asking for a picture a second time. The newest image wins when there are
 * several; a PDF cannot be drawn in a circle and is passed over.
 *
 * The initials are drawn first and always, and the image lies over them once
 * it loads — the OrgMark arrangement, for the same reasons: no empty circle
 * while the signed URL is fetched, no broken-image glyph if it fails, and a
 * student with no photograph gets a deliberate mark rather than a gap.
 *
 * Decorative, and hidden from assistive technology: every place it is drawn
 * has the student's name or "My account" in words beside it.
 */
export function Avatar({ name, className }: { name?: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void photoURL().then(url => { if (!cancelled && url) setSrc(url) })
    return () => { cancelled = true }
  }, [])

  return (
    <span className={`avatar${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="avatar-initials">{initials(name)}</span>
      {src && !failed && (
        <img src={src} alt="" referrerPolicy="no-referrer" decoding="async"
             onError={() => setFailed(true)} />
      )}
    </span>
  )
}
