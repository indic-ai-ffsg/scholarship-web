/* Where an application has got to, said in four steps rather than thirteen.
 *
 * The workflow has thirteen states (0001) and every one of them is meaningful to
 * the organisation running the scheme. To the student they are not: DRAFT,
 * SUBMITTED, DOCUMENT_CHECK, VERIFIED, UNDER_REVIEW, INFO_REQUESTED,
 * SHORTLISTED, APPROVED, SANCTIONED, DISBURSED, CLOSED, REJECTED, WITHDRAWN is
 * a list you have to be taught, and the question behind it is always the same
 * one — has anything happened, and is it my turn.
 *
 * So this collapses them to the four a person actually asks about, in the order
 * they happen. The state's own label is still shown beside the track: this is a
 * reading aid, not a replacement, and a scheme whose workflow renames a stage
 * keeps its own word for it.
 *
 * # Why not one step per state
 *
 * A twelve-dot progress bar is a worse answer than a sentence. It implies the
 * gaps are equal (they are not — DOCUMENT_CHECK is minutes and UNDER_REVIEW is
 * weeks) and it promises detail the student cannot act on. Four steps say the
 * one thing that is true and useful: which part of the process is holding the
 * application now.
 *
 * # The three that are not steps
 *
 * REJECTED, WITHDRAWN and CLOSED do not extend the track, they end it — so they
 * are an `outcome` rather than a fifth dot. A rejection drawn as a completed
 * final step reads as success at a glance, which is the cruellest possible way
 * to render it.
 *
 * INFO_REQUESTED is the one state that is neither progress nor an ending: it is
 * the process stopping to wait for the student. It sits on the Review step and
 * sets `waitingOnYou`, which is what the card leads with.
 */

export type StepState = 'done' | 'current' | 'todo'

export interface TrackStep {
  key: 'sent' | 'checks' | 'review' | 'decision'
  state: StepState
}

export type TrackOutcome = 'none' | 'approved' | 'rejected' | 'withdrawn'

export interface Track {
  steps: TrackStep[]
  outcome: TrackOutcome
  /** INFO_REQUESTED: the application is not moving until the student acts. */
  waitingOnYou: boolean
  /** Nothing further will happen. Used to stop the card promising a next step. */
  finished: boolean
}

/* How far each state has got, as an index into the four steps.
 *
 * A map rather than a switch with ranges, because the order of the enum is not
 * the order of the process — SHORTLISTED sits between UNDER_REVIEW and APPROVED
 * in the enum and is part of Review here, while SANCTIONED and DISBURSED come
 * after APPROVED and are all one Decision to a student who has been told yes.
 */
const REACHED: Record<string, number> = {
  DRAFT: -1,
  SUBMITTED: 0,
  DOCUMENT_CHECK: 1,
  VERIFIED: 1,
  UNDER_REVIEW: 2,
  INFO_REQUESTED: 2,
  SHORTLISTED: 2,
  APPROVED: 3,
  SANCTIONED: 3,
  DISBURSED: 3,
  CLOSED: 3,
  REJECTED: 3,
  WITHDRAWN: 3,
}

const ORDER: TrackStep['key'][] = ['sent', 'checks', 'review', 'decision']

export function trackOf(state: string): Track {
  const reached = REACHED[state] ?? 0
  const outcome: TrackOutcome =
    state === 'REJECTED' ? 'rejected'
      : state === 'WITHDRAWN' ? 'withdrawn'
        : (state === 'APPROVED' || state === 'SANCTIONED' || state === 'DISBURSED'
          || state === 'CLOSED') ? 'approved'
          : 'none'

  const finished = outcome !== 'none'

  const steps: TrackStep[] = ORDER.map((key, i) => ({
    key,
    /* An ended application has no "current" step — the last one is done, or in
       the case of a refusal it is reached rather than achieved, and the card
       says which in words beside the track. Leaving a pulsing "you are here" on
       a closed application is the thing that makes a student check again
       tomorrow. */
    state: i < reached ? 'done'
      : i === reached ? (finished ? 'done' : 'current')
        : 'todo',
  }))

  return {
    steps,
    outcome,
    waitingOnYou: state === 'INFO_REQUESTED',
    finished,
  }
}
