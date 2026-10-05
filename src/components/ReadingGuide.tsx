/* Reading Guide: a band across the screen that follows the line being read.
 *
 * For a reader who loses their place between lines — dyslexia, low vision,
 * tremor. The band follows the pointer, and the keyboard focus when there is no
 * pointer, so it works for somebody tabbing through a form as well as somebody
 * tracking a paragraph with a mouse.
 *
 * Pure decoration to the accessibility tree, and it never takes a click:
 * pointer-events: none lets every press go through to what is under it.
 */

import { useEffect, useState } from 'react'

import { useDisplay } from '../lib/display'

export function ReadingGuide() {
  const { readingGuide } = useDisplay()
  const [y, setY] = useState<number | null>(null)

  useEffect(() => {
    if (!readingGuide) return
    const onMove = (e: PointerEvent) => setY(e.clientY)
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null
      if (!el?.getBoundingClientRect) return
      const r = el.getBoundingClientRect()
      setY(r.top + r.height / 2)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('focusin', onFocus)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('focusin', onFocus)
    }
  }, [readingGuide])

  if (!readingGuide || y === null) return null
  /* The band is inside <body>, which Zoom In scales with CSS zoom, so its
     `top` is multiplied by the zoom while the pointer's y is not. Divided
     back out, or at 200% the band sat twice as far down as the pointer. */
  const zoom = Number.parseFloat(getComputedStyle(document.body).zoom) || 1
  return <div className="reading-guide" aria-hidden="true" style={{ top: `${y / zoom}px` }} />
}
