/* The dashboard's shape the last time it loaded, so its skeleton can take it.
 *
 * Two facts decide the dashboard's lower half, and both arrive with the data:
 * whether the "Received so far" card is there (it sits beside the recent
 * applications and halves their width), and how many recent rows there are.
 * A skeleton that guessed drew the list full width with three rows, and the
 * real one then jumped to half width and one row — the jump this exists to
 * stop. Read from here, the skeleton is already the shape the page will be.
 *
 * Two more flags choose which sentence each tile's waiting line borrows (see
 * Masked in pages/Dashboard): the two it can be differ by a line in a narrow
 * tile, and that line is the page's height.
 *
 * The same kind of hint as session-hint.ts, and with its limits: it grants and
 * says nothing about who. Three flags and a count, no amounts and no names, so
 * a shared handset learns only the dashboard's shape. If
 * it is wrong — first visit, cleared storage, a new award since — the page
 * moves once, as it always did, and the next visit is right. */
const KEY = 'sp.dashShape'

export interface DashShape {
  funding: boolean
  recent: number
  /** Some matches were held back for a missing detail. */
  blocked: boolean
  /** Some application has been decided, so the tile counts outcomes. */
  decided: boolean
}

const FIRST_VISIT: DashShape = { funding: false, recent: 3, blocked: false, decided: false }

export function readDashShape(): DashShape {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<DashShape> | null
    if (!raw) return FIRST_VISIT
    return {
      funding: raw.funding === true,
      blocked: raw.blocked === true,
      decided: raw.decided === true,
      recent: Math.min(5, Math.max(0, Math.round(Number(raw.recent) || 0))),
    }
  } catch {
    return FIRST_VISIT
  }
}

export function writeDashShape(shape: DashShape): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(shape))
  } catch {
    // Unwritable storage: the next skeleton guesses, as it did before.
  }
}
