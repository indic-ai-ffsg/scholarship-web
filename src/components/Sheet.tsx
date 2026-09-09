import { useEffect, useRef, type ReactNode } from 'react'

import { useI18n } from '../lib/i18n-context'

/* A panel that slides in from the side, over the page rather than instead of it.
 *
 * ---------------------------------------------------------------------------
 * Why a sheet and not a page
 * ---------------------------------------------------------------------------
 *
 * The directory's job is comparison: a reader is deciding between four schemes,
 * not reading one. Sending them to /scholarships/<slug> to answer "what does
 * this one actually give me" throws away the list, the filters they set and
 * their place in it, and the way back is a browser control rather than
 * something on the page. Four schemes is four departures and four returns.
 *
 * The full page still exists and still has to: it is what a shared link opens,
 * what a search engine indexes, and what somebody arriving from a printed
 * notice lands on. The sheet is the second way in, for the reader who is
 * already in the list.
 *
 * ---------------------------------------------------------------------------
 * Why <dialog> and not a div with a z-index
 * ---------------------------------------------------------------------------
 *
 * showModal() gives, natively and correctly, every part of this that is
 * normally reimplemented badly: focus moves in, focus cannot leave, everything
 * behind it goes inert to a screen reader and to a pointer, Escape closes it,
 * and it renders in the top layer so no stacking context can trap it under the
 * masthead. This audience is exactly the one a hand-rolled modal fails — a
 * keyboard-only reader who tabs straight out of the panel into a page they
 * cannot see is stuck.
 *
 * What is left to do by hand is small and is done below: telling React when the
 * browser closed it, and stopping the page behind from scrolling.
 */
export function Sheet({
  open, onClose, title, labelledBy, children, footer,
}: {
  open: boolean
  onClose: () => void
  /** The accessible name, when the sheet has no visible heading to point at. */
  title?: string
  /** The id of the visible heading that names it. Preferred over `title`. */
  labelledBy?: string
  children: ReactNode
  /** Pinned to the bottom edge, out of the scrolling region. */
  footer?: ReactNode
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)

  /* Where focus came from, and whether it still has to be put back.
   *
   * close() restores it natively; being unmounted does not, and the back button
   * unmounts. Pressing Back takes ?scheme= out of the address, React removes
   * the dialog, and the element that would have handed focus back goes with it
   * — leaving a keyboard reader at the top of the document, nowhere near the
   * row they were reading. Every other way out (Escape, the close button, the
   * scrim) goes through close() and needs none of this, which is exactly why
   * the gap is easy to miss. */
  const opener = useRef<HTMLElement | null>(null)
  const showing = useRef(false)

  /* showModal() is imperative, and calling it in render would be a side effect
   * during render. It is also not idempotent — calling it on an already-open
   * dialog throws — so both directions are guarded on the element's own state
   * rather than on the previous value of the prop. */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      opener.current = document.activeElement as HTMLElement | null
      el.showModal()
      showing.current = true
    }
    if (!open && el.open) el.close()
  }, [open])

  // Empty deps: this is the unmount path and only the unmount path.
  useEffect(() => () => { if (showing.current) opener.current?.focus() }, [])

  /* The page behind must not scroll.
   *
   * A modal dialog makes the rest of the document inert, which stops it being
   * clicked and read — but not scrolled: a wheel or a two-finger drag over the
   * scrim still moves the list underneath, so closing the sheet returns the
   * reader somewhere they did not choose to be. Set on <html> rather than
   * <body> because iOS Safari ignores it on the latter.
   *
   * Restored on unmount as well as on close, since a route change can take the
   * whole component away with the sheet still open. */
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { root.style.overflow = previous }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={labelledBy ? undefined : title}
      aria-labelledby={labelledBy}
      /* Escape and the backdrop both close through here rather than through
         onKeyDown: the browser closes the dialog itself, and React's state has
         to be told after the fact or the next open() is a no-op against an
         element that is already shut. */
      onClose={() => { showing.current = false; onClose() }}
      /* A press on the scrim closes it, and the target test is what detects
         one. ::backdrop is not an element and cannot be listened to, but a
         press on it reports the dialog itself as the target — while a press
         anywhere inside the panel reports a descendant, because the dialog
         carries no padding of its own for a click to land on.

         onMouseDown rather than onClick, so a text selection that starts inside
         the panel and ends outside it does not count as a press on the scrim.
         Dragging to select the eligibility text and having the sheet vanish is
         the kind of thing that happens once and is never forgotten. */
      onMouseDown={e => { if (e.target === ref.current) ref.current?.close() }}
    >
      {/* Two elements, because a sheet has a fixed edge and a scrolling middle.
          The dialog itself cannot be both: it is the scroll container or it is
          the thing the footer is pinned to, not both at once. */}
      <div className="sheet-inner">
        <button
          type="button"
          className="quiet sheet-close"
          onClick={() => ref.current?.close()}
        >
          <span aria-hidden="true">✕</span>
          <span className="sr-only">{t('sheet.close')}</span>
        </button>

        <div className="sheet-body">{children}</div>

        {/* Outside the scrolling region: the one action must not be something
            you have to scroll to find. */}
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </dialog>
  )
}
