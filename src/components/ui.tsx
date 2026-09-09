/* Shared presentational pieces.
 *
 * Components only — the hooks live in lib/. What they have in common is making
 * the accessibility requirements of section 7.1 the default rather than
 * something each screen has to remember, and doing it at the scale this
 * audience needs: large targets, generous type, and nothing that depends on
 * colour alone.
 */

import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useI18n } from '../lib/i18n-context'
import { awardLabel, deadlineLabel } from '../lib/format'
import { stateClass, stateHelpKey, stateLabelKey, stateMark } from '../lib/eligibility'
import type { EligibilityState, Listing } from '../lib/types'

/* --- field -------------------------------------------------------------------
 * Wires label, hint and error to the control by id. Doing this by hand at each
 * call site is how a form ends up with three labelled inputs and one that a
 * screen reader announces as "edit text, blank". */

export interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  /* Whether to mark this control "(optional)".
   *
   * On by default, because on a form with both kinds it is what tells them
   * apart. A form where nothing is required has nothing to tell apart: the
   * marker then repeats on every single field and says only what one sentence
   * above the form has already said. A form of that shape turns it off. */
  optional?: boolean
  children: (props: {
    id: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
    required?: boolean
  }) => ReactNode
}

export function Field({ label, hint, error, required, optional = true, children }: FieldProps) {
  const { t } = useI18n()
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {/* The star for the eye, the word for the ear. The sentence at the
            top of a form promises a star, so every required control Field draws
            has to carry one — leaving it to the call sites is what let eight of
            them ship without it. aria-hidden because "asterisk" read aloud is
            noise, and the sr-only word is the accessible half of the same
            mark. */}
        {required && <span className="req" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> ({t('common.required')})</span>}
        {!required && optional && <span className="muted"> ({t('common.optional')})</span>}
      </label>

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        required,
      })}

      {hint && <span className="hint" id={`${id}-hint`}>{hint}</span>}
      {/* role="alert" so a validation failure is spoken when it appears, not
          only when the field is next focused. */}
      {error && <span className="error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  )
}

/* --- choices -----------------------------------------------------------------
 * The wizard's main input. Large tappable rows rather than a small radio beside
 * a label, because the target user includes people with tremor and limited fine
 * motor control operating a phone one-handed.
 *
 * A real <fieldset>/<legend> and real radios: a screen reader then announces
 * "3 of 21" and the arrow keys work, both of which a div-based control has to
 * reimplement and usually gets wrong. */

export interface Option {
  value: string
  label: string
  sub?: string
}

interface ChoiceGroupProps {
  legend: string
  name: string
  options: Option[]
  value: string | undefined
  onChange: (value: string) => void
}

export function ChoiceGroup({ legend, name, options, value, onChange }: ChoiceGroupProps) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="sr-only">{legend}</legend>
      <div className="choices">
        {options.map(opt => (
          <label className="choice" key={opt.value}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span>
              <span className="label">{opt.label}</span>
              {opt.sub && <span className="sub">{opt.sub}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/* --- eligibility ---------------------------------------------------------------
 * The four states of Table 4.2, rendered so the distinction survives monochrome
 * printing, colour vision deficiency and a screen reader. Each carries a word
 * and a distinct leading mark; the colour is the third signal, not the only one. */

export function StateBadge({ state }: { state: EligibilityState }) {
  const { t } = useI18n()

  return (
    <span className={`state-badge ${stateClass(state)}`}>
      <span aria-hidden="true">{stateMark(state)}</span>
      {t(stateLabelKey(state))}
    </span>
  )
}

/* --- one classified scheme --------------------------------------------------------
 *
 * Used by the matched list, and built to be shared: the four states are the
 * product's own vocabulary and a second card design for them would read as a
 * different product. It had a second caller — the public eligibility check —
 * until that page was removed, which is why what can be done next is still the
 * caller's business, passed as children, and why the state's explanation can be
 * overridden where the standard sentence would not be true. */
export function ResultCard({
  state, title, slug, award, benefit, organisation, daysRemaining, nextAction, help, children,
}: {
  state: EligibilityState
  title: string
  slug: string
  /* Optional: not every award is money. The caller passes benefit_summary
     alongside it and awardLabel picks. */
  award?: number
  benefit?: string
  organisation: string
  /* Optional since backend 0043: a curated listing may have no window, and
     an open-ended scheme is not urgent. See format.deadlineLabel. */
  daysRemaining?: number
  nextAction?: string
  /** Replaces the state's own sentence. Only where that sentence would lie. */
  help?: string
  children?: ReactNode
}) {
  const { t } = useI18n()


  return (
    <article className={`card match ${stateClass(state)}`}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <StateBadge state={state} />
        <Deadline days={daysRemaining} />
      </div>

      <h3 style={{ marginBottom: '0.25rem' }}>
        <Link to={`/scholarships/${slug}`}>{title}</Link>
      </h3>
      <p className="muted" style={{ marginBottom: '0.5rem' }}>
        {awardLabel(t, award, benefit)} · {organisation}
      </p>

      <p className="muted" style={{ fontSize: 'var(--step--1)' }}>{help ?? t(stateHelpKey(state))}</p>

      {/* The next action. For BLOCKED this is the entire point of the state, so
          it is an instruction with visual weight, not a footnote. */}
      {nextAction && (
        <p className="next-action">
          <span className="mark" aria-hidden="true">{stateMark(state)}</span>
          <span>{nextAction}</span>
        </p>
      )}

      {children && <div className="row" style={{ marginTop: '1rem' }}>{children}</div>}
    </article>
  )
}

/* --- notices --------------------------------------------------------------------- */

export function Notice({
  tone = 'info', title, children,
}: {
  tone?: 'info' | 'good' | 'warn' | 'danger'
  title?: string
  children: ReactNode
}) {
  return (
    // Only a genuine problem interrupts; the rest is read in document order.
    <div className={`notice ${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  )
}

/* --- states ------------------------------------------------------------------------ */

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div className="state-block" role="status" aria-busy="true">
      {label ?? t('common.loading')}…
    </div>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="state-block">
      <strong>{title}</strong>
      {hint && <p style={{ margin: '0 auto 1rem', maxWidth: '30rem' }}>{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n()
  const message = error instanceof Error ? error.message : t('common.error')
  const requestId = (error as { requestId?: string })?.requestId

  return (
    <Notice tone="danger" title={t('common.error')}>
      <p>{message}</p>
      {requestId && (
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          {/* Quoting one short string to a helpline is far easier than
              describing what happened. */}
          Reference: {requestId}
        </p>
      )}
      {onRetry && <button onClick={onRetry}>{t('common.retry')}</button>}
    </Notice>
  )
}

/* --- offline ------------------------------------------------------------------------
 * Says so, rather than letting a save fail silently on a train. Drafts survive
 * locally either way (see lib/draft.ts); this is what tells the student that. */

export function OfflineBanner() {
  const { t } = useI18n()
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!offline) return null
  return <div className="offline" role="status">{t('common.offline')}</div>
}

/* The wizard's progress meter used to live here, and went with the wizard —
 * eleven screens became one form (see pages/Register). Nothing imported it.
 *
 * The .progress and .bar styles it used are still live: Dashboard and Profile
 * both draw a completeness meter from the same classes, inline. If a third one
 * ever appears, those two are the ones to fold into a shared component — this
 * one was not that component, it was the counter for a flow that no longer
 * exists ("Question 4 of 11"). */

/* A closing date, and how close it is.
 *
 * One component for all four places that showed one — the landing page's
 * deadline list, the directory card, a scheme page and a match card — which
 * previously each rebuilt the same span and the same `soon ? 'soon' : ''`. The
 * mark comes from format.deadlineLabel with the text, so a state cannot be
 * given a colour here and a shape somewhere else.
 *
 * The mark is aria-hidden and the text is the whole announcement: "Closes in 34
 * days" needs no tick read out in front of it. Nothing animates — a deadline
 * that flashes is a deadline nobody can read.
 */
/* A sponsor's mark, when the sponsor has uploaded one.
 *
 * Nothing is drawn when they have not, and no placeholder stands in. A grey box
 * where a logo would go says "this one is missing something" about a provider
 * whose only failing is not having sent us a PNG — and 0028 was written against
 * exactly that reading, where a government scheme with a mark beside an NGO
 * scheme without one makes the NGO look less real.
 *
 * `alt=""`, always, and the attribute is required rather than optional so this
 * is a decision rather than an omission: the organisation's name is already
 * beside the mark in text, so describing the picture would make a screen reader
 * announce the same sponsor twice. The server holds a real alt string
 * (0028 refuses an upload without one) and it is the right one for a context
 * where the logo stands alone — this is not that context.
 *
 * width and height are set from the stored dimensions, so the row reserves the
 * box before the bytes land. Without them a directory of fifty rows reflows
 * fifty times as the images arrive, which is the layout shift 0028 stores the
 * dimensions to prevent.
 */
export function SponsorLogo({ listing }: { listing: Pick<Listing, 'logo_url' | 'logo_width' | 'logo_height'> }) {
  if (!listing.logo_url) return null

  return (
    <img
      className="sponsor-mark"
      src={api.assetUrl(listing.logo_url)}
      alt=""
      width={listing.logo_width}
      height={listing.logo_height}
      /* Off the critical path: the mark is not what the reader came for, and on
         a metered connection fifty of them should not compete with the text
         that answers their question. */
      loading="lazy"
      decoding="async"
    />
  )
}

export function Deadline({ days, children }: { days?: number; children?: ReactNode }) {
  const { t } = useI18n()
  const { text, state, mark } = deadlineLabel(t, days)

  return (
    <span className={`deadline ${state}`}>
      <span className="mark" aria-hidden="true">{mark}</span>
      {text}
      {children}
    </span>
  )
}
