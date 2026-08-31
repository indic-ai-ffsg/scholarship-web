import type { EligibilityState } from './types'

/* The four states of Table 4.2, described in one place.
 *
 * Plain functions, so this lives outside a component module — a module exporting
 * both a component and a plain function breaks Fast Refresh.
 *
 * Everything a state carries is here rather than inlined at its call sites, and
 * that matters more since the public eligibility check arrived: the anonymous
 * check and the signed-in matched list render the same four states from two
 * different endpoints. A state whose colour, mark or explanation differed
 * between those two pages would read as two different answers to the one
 * question a student came to ask.
 */

interface StateMeta {
  /** The CSS modifier. */
  css: string
  /** A shape, so the state survives monochrome printing and colour blindness. */
  mark: string
  /** The state's own name. */
  label: string
  /** One sentence on what it means for the reader. */
  help: string
}

const STATES: Record<EligibilityState, StateMeta> = {
  ELIGIBLE: { css: 'eligible', mark: '✓', label: 'match.eligible', help: 'match.eligibleHelp' },
  LIKELY_ELIGIBLE: { css: 'likely', mark: '~', label: 'match.likely', help: 'match.likelyHelp' },
  BLOCKED: { css: 'blocked', mark: '!', label: 'match.blocked', help: 'match.blockedHelp' },
  NOT_ELIGIBLE: { css: 'ineligible', mark: '×', label: 'match.ineligible', help: 'match.ineligibleHelp' },
}

export function stateClass(state: EligibilityState) {
  return STATES[state].css
}

export function stateMark(state: EligibilityState) {
  return STATES[state].mark
}

export function stateLabelKey(state: EligibilityState) {
  return STATES[state].label
}

export function stateHelpKey(state: EligibilityState) {
  return STATES[state].help
}

/* Whether an application can be started at all.
 *
 * The same two states the server allows (EligibilityState.CanApply), and worth
 * keeping in step: a portal offering an Apply button the API will refuse sends
 * somebody through a consent screen to a rejection. */
export function canApply(state: EligibilityState) {
  return state === 'ELIGIBLE' || state === 'LIKELY_ELIGIBLE'
}
