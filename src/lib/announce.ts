import { createContext, useContext } from 'react'

/* The announcement channel.
 *
 * Kept apart from the component that renders it so that both a page and the
 * provider can import the hook without pulling a component into a module that
 * exports only functions — which is what breaks Fast Refresh.
 */

/** How a confirmation is coloured. The words always carry the meaning too. */
export type Tone = 'ok' | 'warn' | 'danger'

/* `spokenOnly`: said to a screen reader and not drawn. For a change the
   reader can already see where they made it — the accessibility panel's
   switches show "On" and "Off" on the button pressed, and a toast for each
   press only stacked up over the page. */
export interface AnnounceOptions { spokenOnly?: boolean }

export type Announce = (message: string, tone?: Tone, options?: AnnounceOptions) => void

export const AnnouncerContext = createContext<Announce>(() => {})

/**
 * Reports the result of an action: spoken into the page's live region and shown
 * on screen at the same time.
 */
export const useAnnounce = () => useContext(AnnouncerContext)
