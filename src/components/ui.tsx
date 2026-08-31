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

import { useI18n } from '../lib/i18n-context'
import { money } from '../lib/format'
import { stateClass, stateHelpKey, stateLabelKey, stateMark } from '../lib/eligibility'
import type { EligibilityState } from '../lib/types'

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
   * above the form has already said. The public eligibility check turns it off
   * for that reason. */
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
 * Shared by the signed-in matched list and the public eligibility check, which
 * is the point of it being here: somebody who checked their eligibility before
 * registering should meet the same card afterwards, in the same order, carrying
 * the same instruction. A second card design for the same four states would
 * make the portal look like a different product from the site that sent them.
 *
 * What legitimately differs between the two is what can be done next — a
 * visitor has no application to open and no documents to add — so the buttons
 * are the caller's, passed as children, and the state's explanation can be
 * overridden where the standard one would not be true for that caller. */
export function ResultCard({
  state, title, slug, award, organisation, daysRemaining, nextAction, help, children,
}: {
  state: EligibilityState
  title: string
  slug: string
  award: number
  organisation: string
  daysRemaining: number
  nextAction?: string
  /** Replaces the state's own sentence. Only where that sentence would lie. */
  help?: string
  children?: ReactNode
}) {
  const { t } = useI18n()
  const soon = daysRemaining <= 7

  return (
    <article className={`card match ${stateClass(state)}`}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <StateBadge state={state} />
        <span className={`deadline ${soon ? 'soon' : ''}`}>
          {t('public.closesIn', { n: daysRemaining })}
        </span>
      </div>

      <h3 style={{ marginBottom: '0.25rem' }}>
        <Link to={`/scholarships/${slug}`}>{title}</Link>
      </h3>
      <p className="muted" style={{ marginBottom: '0.5rem' }}>
        {money(award)} · {organisation}
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

/* --- progress -------------------------------------------------------------------------
 * The wizard's reassurance that this ends. */

export function Progress({ step, total }: { step: number; total: number }) {
  const { t } = useI18n()
  const percent = Math.round((step / total) * 100)

  return (
    <div className="progress">
      <div className="label">
        <span>{t('profile.step', { n: step, total })}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t('profile.step', { n: step, total })}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
