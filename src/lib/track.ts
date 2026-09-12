/* Where an application has got to, said in three steps rather than thirteen.
 *
 * The workflow's states are all meaningful to the organisation running the
 * scheme. To the student they are not: SUBMITTED, UNDER_REVIEW, INFO_REQUESTED,
 * APPROVED, SANCTIONED, DISBURSED, CLOSED, REJECTED, WITHDRAWN is a list you
 * have to be taught, and the question behind it is always the same one — has
 * anything happened, and is it my turn.
 *
 * So this collapses them to the three a person actually asks about, in the order
 * they happen. The state's own label is still shown beside the track: this is a
 * reading aid, not a replacement, and a scheme whose workflow renames a stage
 * keeps its own word for it.
 *
 * # Why not one step per state
 *
 * A twelve-dot progress bar is a worse answer than a sentence. It implies the
 * gaps are equal — they are not; arriving is instant and being read is weeks —
 * and it promises detail the student cannot act on. Three steps say the one
 * thing that is true and useful: which part of the process is holding the
 * application now.
 *
 * # Why three and not four
 *
 * There was a Checks step, for DOCUMENT_CHECK and VERIFIED. Migration 0057
 * removed both stages from the workflow: documents are verified once in the
 * vault, against the student rather than against each of their applications, so
 * an application never passed through a check of its own. The step was a dot
 * that lit for a few minutes at most and, for every application filed after
 * 0057, never lights at all — which is worse than not being there, because a
 * permanently grey step reads as something that has gone wrong.
 *
 * The two states are still mapped below. Applications filed before 0057 are
 * still in the history, and a student opening one of those has to see something
 * truthful: they sit on Review, which is where the workflow now sends them.
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
  key: 'sent' | 'review' | 'decision'
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

/* How far each state has got, as an index into the three steps.
 *
 * A map rather than a switch with ranges, because the order of the enum is not
 * the order of the process: SANCTIONED and DISBURSED come after APPROVED and
 * are all one Decision to a student who has been told yes.
 *
 * The three stages migration 0057 retired are still here, mapped onto Review.
 * They take no new applications, and the ones that were in them when the change
 * landed are exactly the students most likely to be checking.
 */
const REACHED: Record<string, number> = {
  DRAFT: -1,
  SUBMITTED: 0,
  UNDER_REVIEW: 1,
  INFO_REQUESTED: 1,
  // Retired by 0057; kept so an application filed before it still reads true.
  DOCUMENT_CHECK: 1,
  VERIFIED: 1,
  SHORTLISTED: 1,
  APPROVED: 2,
  SANCTIONED: 2,
  DISBURSED: 2,
  CLOSED: 2,
  REJECTED: 2,
  WITHDRAWN: 2,
}

const ORDER: TrackStep['key'][] = ['sent', 'review', 'decision']

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
