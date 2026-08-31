/* Local draft storage.
 *
 * Table 4.1 asks for drafts tolerant of connection loss. The realistic scenario
 * is a student filling in their profile on a phone, on an intermittent
 * connection, in a place where the signal comes and goes — and losing eleven
 * answers to one failed request is how somebody stops using a platform for good.
 *
 * So every answer is written to this device the moment it is given, and only
 * then sent. If the send fails the answer is still here; if the browser is
 * closed and reopened next week the answers are still here.
 *
 * What is stored is deliberately bounded. A partly-filled profile contains a
 * disability percentage and a family income — sensitive personal data under the
 * DPDP Act — so it is cleared as soon as the server has it, and it is never
 * written for anybody but the account that produced it.
 */

const PREFIX = 'scholarship.draft'

function key(name: string, ownerId: string) {
  // Namespaced by account. A shared family device must not show one sibling's
  // half-finished profile to another.
  return `${PREFIX}.${ownerId}.${name}`
}

export function saveDraft<T>(name: string, ownerId: string, value: T) {
  try {
    localStorage.setItem(key(name, ownerId), JSON.stringify({
      savedAt: new Date().toISOString(),
      value,
    }))
  } catch {
    // Private browsing, or a full quota. Losing the draft is bad; failing the
    // keystroke that produced it is worse.
  }
}

export function readDraft<T>(name: string, ownerId: string): { value: T; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(key(name, ownerId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as { savedAt: string; value: T }
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearDraft(name: string, ownerId: string) {
  try {
    localStorage.removeItem(key(name, ownerId))
  } catch {
    /* nothing useful to do */
  }
}

/** Clears every draft for an account, on sign-out. */
export function clearAllDrafts(ownerId: string) {
  try {
    const prefix = `${PREFIX}.${ownerId}.`
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(prefix)) localStorage.removeItem(k)
    }
  } catch {
    /* nothing useful to do */
  }
}
