/* The portal's only front door.
 *
 * Two steps, one number: enter a mobile number, then the code sent to it. There
 * is no separate registration page any more, because there is no longer a
 * question to answer before the code is sent. The database is still consulted —
 * /auth/phone looks the number up and creates an account when it finds none —
 * but that happens after the code is verified, inside the same call, and both
 * outcomes land the student in the same place.
 *
 * That ordering is not only a simplification. Asking "do you have an account?"
 * up front requires the server to answer whether a given number is registered,
 * which on a platform whose user base is defined by disability status is a
 * disclosure worth not building.
 *
 * The screen is built as a card rather than as a page, and that is the one
 * layout decision here worth defending. Every other screen in the portal is a
 * page of content inside the shell; this one is a single question with a single
 * answer, and a bare heading over a bare input on an open page gave a student
 * arriving from an SMS link nothing to fix their eye on — no boundary, no sense
 * of how long this would take, and no visible sign of whose site had just asked
 * them for their phone number. The card supplies the boundary, the two-step
 * meter supplies the length, and the line under the button says what the
 * number is for — which is the question this audience is warned to ask.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../lib/auth-context'
import { useI18n } from '../lib/i18n-context'
import { formatE164 } from '../lib/otp'
import { safeNext } from '../lib/next'
import { Field, Notice } from '../components/ui'

/* Long enough that an SMS has a fair chance of arriving before the button
 * tempts anyone, short enough not to strand somebody whose message never came.
 * The provider applies its own per-number limits underneath regardless. */
const RESEND_SECONDS = 30

const CODE_LENGTH = 6

/* The same rule toE164 applies, checked here as well so the complaint can land
 * on the field being typed into. A red banner at the top of the page that says
 * "enter a 10-digit number" while the cursor sits in the box that holds the
 * wrong one makes the reader look in two places to learn one thing. */
const MOBILE = /^[6-9]\d{9}$/

/* 98765 43210 — the grouping printed on a phone bill, so a number being copied
 * off a document can be checked against the source in two glances rather than
 * ten. Applied as the field is typed in, which is also what stops a ten-digit
 * run of unbroken numerals being proof-read one digit at a time. */
function group(digits: string) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits
}

/* The caret belongs after the last digit, wherever the box was pressed.
 *
 * There is one string behind the six boxes, so pressing the fourth box with
 * two digits typed cannot mean "type into box four" — a digit inserted in the
 * middle of the string would appear somewhere the pointer never was. A frame
 * later, because the browser sets its own selection from the click after the
 * handler returns. */
function caretToEnd(e: { currentTarget: HTMLInputElement }) {
  const el = e.currentTarget
  requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length))
}

export default function SignIn() {
  const { t } = useI18n()
  const {
    requestCode, submitCode, resendCode, cancelCode, clearError,
    status, pendingCode, error,
  } = useAuth()
  const location = useLocation()

  /* Digits only, never the spaces the field displays. Everything downstream —
   * the validity test, the E.164 conversion — then works on one shape. */
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resentAt, setResentAt] = useState<number | null>(null)
  const [resent, setResent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const phoneInput = useRef<HTMLInputElement | null>(null)
  const codeInput = useRef<HTMLInputElement | null>(null)
  const awaitingCode = status === 'awaiting_code' && pendingCode

  /* The countdown that gates the resend button. */
  useEffect(() => {
    if (!awaitingCode) return
    const started = resentAt ?? Date.now()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      setSecondsLeft(Math.max(0, RESEND_SECONDS - elapsed))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [awaitingCode, resentAt])

  /* Move to the code box the moment it appears, so the student can type
     straight from the notification without hunting for the field. */
  useEffect(() => {
    if (awaitingCode) codeInput.current?.focus()
  }, [awaitingCode])

  if (status === 'authenticated') {
    /* Both branches land on the dashboard: whether the number was recognised or
     * had to be registered is the API's business, not a fork in the journey.
     * A brand-new account is not dropped somewhere empty — the dashboard reads
     * its own missing profile and becomes the single instruction to add
     * details, which is the same destination the wizard would have been,
     * arrived at by a route that also works for everyone else.
     *
     * A returning student still goes wherever they were headed, which is a
     * specific scholarship when they came in by pressing Apply on the public
     * eligibility check. */
    return <Navigate to={safeNext(location.search)} replace />
  }

  function changePhone(value: string) {
    /* Take the last ten digits of whatever arrives. A number pasted off a
     * contact card comes with +91, or 0, or dots between the groups, and none
     * of those is a mistake the person pasting should have to go back and
     * clean up by hand. */
    const digits = value.replace(/\D/g, '').slice(-10)
    setPhone(digits)
    if (phoneError) setPhoneError(null)
    if (error) clearError()
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    /* Two messages, because "that does not look right" is not true of a box
     * nobody has typed in yet. */
    if (!phone || !MOBILE.test(phone)) {
      setPhoneError(t(phone ? 'auth.phoneInvalid' : 'auth.phoneMissing'))
      phoneInput.current?.focus()
      return
    }

    setBusy(true)
    try {
      await requestCode(phone)
      setResentAt(Date.now())
    } catch {
      /* the provider holds the message */
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResent(false)
    try {
      await submitCode(code)
    } catch {
      // Wrong or expired: clear the box so the next attempt is not typed on
      // top of the last one.
      setCode('')
      codeInput.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setBusy(true)
    setResent(false)
    try {
      await resendCode()
      setResentAt(Date.now())
      setResent(true)
    } catch {
      /* the provider holds the message */
    } finally {
      setBusy(false)
    }
  }

  function startOver() {
    setCode('')
    setResent(false)
    cancelCode()
  }

  const step = awaitingCode ? 2 : 1

  return (
    <div className="page narrow auth">
      <div className="auth-card">
        {/* How far in, and how far to go, as an eyebrow above the title. Two
            steps is short enough that saying so removes most of the reason to
            abandon a form that has just asked for a phone number.

            No brand mark in here, though the card is the one place on the site
            where "whose form is this" is a fair question. The masthead is
            sticky and sits four rems above it, and the same name twice inside
            one screenful reads as a mistake rather than as reassurance. */}
        <p className="auth-progress">
          <span className="ticks" aria-hidden="true">
            <span className="tick on" />
            <span className={`tick ${step === 2 ? 'on' : ''}`} />
          </span>
          {t('auth.stepOf', { n: step, name: step === 1 ? t('auth.stepPhone') : t('auth.stepCode') })}
        </p>

        {error && <Notice tone="danger">{error}</Notice>}

        {!awaitingCode ? (
          <form onSubmit={sendCode} noValidate>
            <h1>{t('auth.signin')}</h1>
            <p className="auth-lede">{t('auth.oneDoor')}</p>

            <Field
              label={t('auth.phone')}
              hint={t('auth.phoneHint')}
              error={phoneError ?? undefined}
              required
            >
              {props => (
                /* The country code is fixed furniture rather than a prefilled
                 * "+91" the student has to type around or accidentally delete.
                 * It sits inside the control's own border so the two read as
                 * one number; the border and the focus ring belong to the
                 * group for the same reason. */
                <span className="input-group">
                  <span className="prefix" aria-hidden="true">+91</span>
                  <input
                    {...props}
                    ref={phoneInput}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={t('auth.phonePlaceholder')}
                    maxLength={11}
                    autoFocus
                    value={group(phone)}
                    onChange={e => changePhone(e.target.value)}
                  />
                </span>
              )}
            </Field>

            <button type="submit" className="primary wide" disabled={busy}>
              {busy ? t('auth.sending') : t('auth.sendCode')}
            </button>

            <p className="auth-fine">{t('auth.privacy')}</p>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            <h1>{t('auth.codeTitle')}</h1>

            {/* The number it went to, with the way back to change it beside it
                rather than at the bottom of the screen: a typo in the number is
                discovered here, at the moment nothing arrives, and the remedy
                should be in the same place as the evidence. */}
            <p className="auth-target">
              <span className="number">{formatE164(pendingCode.phone)}</span>
              <button type="button" className="quiet small" onClick={startOver} disabled={busy}>
                {t('auth.changeNumber')}
              </button>
            </p>

            {/* Which branch of the flow this is. Checked before the code was
                sent, so the student knows whether they are signing in or being
                registered before they commit to typing anything. */}
            <p className="auth-branch">
              <span className="mark" aria-hidden="true">{pendingCode.returning ? '✓' : '＋'}</span>
              <span>{pendingCode.returning ? t('auth.welcomeBack') : t('auth.newHere')}</span>
            </p>

            <Field label={t('auth.code')} hint={t('auth.codeHint')} required>
              {props => (
                /* Six boxes, one field.
                 *
                 * The boxes are spans. The only control here is the single
                 * input lying transparent across all six, and that is the
                 * whole design: six real inputs is the usual way to draw this
                 * and it is the wrong one for this audience. Six inputs are
                 * announced as six unlabelled boxes rather than as one
                 * "6-digit code"; the phone offers the code from the message
                 * to the first of them only; a pasted code has to be caught
                 * and split by hand; and each box is a 36px target on a 320px
                 * screen. One input keeps the one-time-code autofill, keeps
                 * paste, keeps backspace behaving the way it reads, and makes
                 * the target the full width of the group — which matters for
                 * the same reason every other control here is 48px.
                 *
                 * The input's text is transparent rather than the input being
                 * hidden. opacity: 0 and visibility: hidden are exactly what
                 * autofill heuristics look at to decide a field is not really
                 * on the page, and the autofill is the point. */
                <span className="code-boxes">
                  <span className="boxes" aria-hidden="true">
                    {Array.from({ length: CODE_LENGTH }, (_, i) => (
                      <span
                        key={i}
                        className={
                          'box' +
                          (code[i] ? ' filled' : '') +
                          (i === code.length ? ' next' : '')
                        }
                      >
                        {code[i] ?? ''}
                      </span>
                    ))}
                  </span>

                  <input
                    {...props}
                    ref={codeInput}
                    type="text"
                    /* one-time-code lets a phone offer the digits straight from the
                       message, which saves the copy-paste this audience is most
                       likely to get wrong. */
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={CODE_LENGTH}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                    onFocus={caretToEnd}
                    onClick={caretToEnd}
                  />
                </span>
              )}
            </Field>

            <button
              type="submit"
              className="primary wide"
              disabled={busy || code.length < CODE_LENGTH}
            >
              {busy ? t('auth.checking') : t('auth.verify')}
            </button>

            {/* Spoken as well as shown: pressing "send it again" otherwise
                changes nothing a screen reader can hear, and the second press
                that follows is a second SMS the student did not need. */}
            <p className="auth-sent" role="status">
              {resent ? t('auth.resent') : ''}
            </p>

            <div className="auth-foot">
              <span className="muted">{t('auth.noCode')}</span>
              <button
                type="button"
                className="quiet"
                onClick={resend}
                disabled={busy || secondsLeft > 0}
              >
                {secondsLeft > 0 ? t('auth.resendIn', { n: secondsLeft }) : t('auth.resend')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
