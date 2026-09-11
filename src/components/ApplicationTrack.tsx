import { useI18n } from '../lib/i18n-context'
import type { Track } from '../lib/track'

/* Where an application has got to, drawn.
 *
 * # It is a list, not a picture
 *
 * An ordered list of four items, styled into a row. That matters more here than
 * in most places: the people this site is built for include students using a
 * screen reader, and a progress bar assembled from divs announces nothing at
 * all. As a list it reads out as four steps with their states said in words —
 * which is also why every dot carries its status as text rather than as a
 * colour and a shape.
 *
 * # Colour is never the only signal
 *
 * Done is a tick, current is a filled ring, still-to-come is an empty one, and
 * each has its own word in the label beneath. Print this page in greyscale, or
 * read it with a colour vision deficiency, and the same four facts survive. The
 * connecting rule between dots is decoration and is aria-hidden.
 *
 * # A refusal is not a completed track
 *
 * When the outcome is a rejection the last step is still reached — the decision
 * did happen — but the whole track takes the muted treatment and the card beside
 * it says what the decision was. Drawing a rejection as four green ticks is a
 * glance that says "you got it", and a student should never have to read the
 * small print to find out otherwise.
 */
export default function ApplicationTrack({ track }: { track: Track }) {
  const { t } = useI18n()

  return (
    <ol
      className={`track${track.outcome === 'rejected' || track.outcome === 'withdrawn' ? ' track-ended' : ''}`}
      aria-label={t('track.label')}
    >
      {track.steps.map(step => (
        <li key={step.key} className={`track-step is-${step.state}`}>
          {/* The rule to the previous dot. Decoration: the list order already
              says these are sequential, and announcing it would put "line"
              between every pair of steps. */}
          <span className="track-rule" aria-hidden="true" />

          <span className="track-dot" aria-hidden="true">
            {step.state === 'done' && (
              <svg viewBox="0 0 16 16" width="11" height="11" focusable="false">
                <path
                  d="M2 8.5l4 4 8-9"
                  fill="none" stroke="currentColor" strokeWidth="2.6"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            )}
          </span>

          <span className="track-name">{t(`track.${step.key}`)}</span>

          {/* The state in words, for anyone not reading the shape. Visually
              hidden because sighted readers have the tick and the fill, and a
              second label under every dot would treble the height of a row
              that has to fit four across a phone. */}
          <span className="sr-only">
            {' — '}
            {t(step.state === 'done' ? 'track.doneSr'
              : step.state === 'current' ? 'track.currentSr'
                : 'track.todoSr')}
          </span>
        </li>
      ))}
    </ol>
  )
}
