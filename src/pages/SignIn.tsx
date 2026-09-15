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
import { formatE164, type Channel } from '../lib/otp'
import { safeNext } from '../lib/next'
import { Field, Notice } from '../components/ui'


const CODE_LENGTH = 6
const RESEND_SECONDS = 30

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
    status, pendingCode, error, errorReason,
  } = useAuth()
  const location = useLocation()

  /* Digits only, never the spaces the field displays. Everything downstream —
   * the validity test, the E.164 conversion — then works on one shape. */
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  /* Which action is in flight, not merely that one is.
   *
   * A boolean cannot answer that, and the answer is what the styling needs:
   * the three resend channels sit beside Verify and are held by the same flag,
   * so a boolean would draw "working" on four controls at once and say nothing
   * about which one was pressed. The tag names the pressed control; `disabled`
   * still reads the derived boolean, because being held is still being held. */
  const [working, setWorking] = useState<'send' | 'verify' | Channel | null>(null)
  const busy = working !== null

  /* Disabled because this button's own work is running, or only because some
   * other button's is? The second must not repaint — see the note on
   * :not([data-held]) in styles.css. `unavailable` is the button's own reason
   * to be off, the one the student can act on, and it always wins. */
  const held = (own: boolean, unavailable = false) =>
    (busy && !own && !unavailable) || undefined
  const [resent, setResent] = useState(false)
  /* Which way the last code was sent, so the confirmation can name it —
     "sent on WhatsApp" is the only way to know the choice took effect. */
  const [sentVia, setSentVia] = useState<Channel>('sms')
  /* Seconds since the last code went out, counted down from 30.
   *
   * A number to wait against, not a gate. It used to disable all three channels
   * while it ran, which is what took WhatsApp away from a student whose SMS had
   * been dropped — see the note further down. Every button stays pressable; this
   * only answers "has it been long enough to be worth trying again", which is
   * the question somebody staring at a phone that has not buzzed is actually
   * asking, and it stops the reflex press two seconds after the last one. */
  const [resentAt, setResentAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const phoneInput = useRef<HTMLInputElement | null>(null)
  const codeInput = useRef<HTMLInputElement | null>(null)
  const awaitingCode = status === 'awaiting_code' && pendingCode

  useEffect(() => {
    if (!awaitingCode || resentAt === null) return
    const tick = () => setSecondsLeft(
      Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - resentAt) / 1000)),
    )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [awaitingCode, resentAt])


  /* No shared countdown on the three channels.
   *
   * They were gated together for thirty seconds after any one of them: press
   * "Send by SMS" and all three greyed out under a line reading "Send it again
   * in 27s". The intent was to stop four messages going out while the first was
   * still in flight, and on one road that is right — but it was applied across
   * all three, so it also blocked the thing this group exists for.
   *
   * The note beside these buttons already says why: SMS is silently dropped by
   * some Indian operators under DLT, and "a student whose SMS is being dropped
   * needs WhatsApp first rather than after two more failures". A student who
   * pressed SMS, waited, and got nothing was then told to wait again before
   * they could try the road that would have worked — and for a deaf student
   * mis-tapping "Call me with the code", the wait is thirty seconds of a
   * message they cannot use before they may ask for the one they can.
   *
   * What actually stops a double send is `busy`: a press is refused while its
   * own request is in the air, which is the second or two that matters. Beyond
   * that, pressing again is a deliberate act by somebody holding a phone that
   * has not buzzed, and it is not this screen's place to argue with them. */

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
     * specific scholarship when they came in by pressing Apply on one. */
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

    setWorking('send')
    try {
      await requestCode(phone)
      setResentAt(Date.now())
    } catch {
      /* the provider holds the message */
    } finally {
      setWorking(null)
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setWorking('verify')
    setResent(false)
    try {
      await submitCode(code)
    } catch {
      // Wrong or expired: clear the box so the next attempt is not typed on
      // top of the last one.
      setCode('')
      codeInput.current?.focus()
    } finally {
      setWorking(null)
    }
  }

  /* One handler for all three channels.
   *
   * `channel` undefined is a plain repeat on whichever was used, which is SMS,
   * and is what the bare "send it again" button asks for. */
  async function resend(channel?: Channel) {
    setWorking(channel ?? 'sms')
    setResent(false)
    try {
      await resendCode(channel)
      setResentAt(Date.now())
      setSentVia(channel ?? 'sms')
      setResent(true)
    } catch {
      /* the provider holds the message */
    } finally {
      setWorking(null)
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

        {/* A closed account is answered in full rather than as a red line.
          *
          * Branching on the server's reason, not on the words it sent — see
          * AuthState.errorReason. `warn` rather than `danger`: nothing has gone
          * wrong here and nothing is broken, which is what danger would say;
          * the account is in a state, and the panel's job is to explain it.
          *
          * "Request support (soon)" is deliberately not a button. A control
          * that looks pressable and does nothing is worse than a sentence —
          * somebody clicks it, nothing happens, and now they doubt the rest of
          * the screen too. It becomes a real link when there is something for
          * it to open. */}
        {error && (errorReason === 'ACCOUNT_CLOSED' ? (
          <Notice tone="warn" announce title={t('auth.closedTitle')}>
            <p style={{ marginTop: 0 }}>{t('auth.closedHelp')}</p>
            <p className="muted" style={{ marginBottom: 0 }}>{t('auth.closedSoon')}</p>
          </Notice>
        ) : (
          <Notice tone="danger">{error}</Notice>
        ))}

        {!awaitingCode ? (
          <form onSubmit={sendCode} noValidate>
            <h1>{t('auth.title')}</h1>
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

            <button type="submit" className="primary wide" disabled={busy} aria-busy={working === 'send' || undefined}>
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
              <button type="button" className="quiet small" onClick={startOver} disabled={busy} data-held={held(false)}>
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
                          /* Clamped to the last box, not `i === code.length`.
                             .next is the focus indicator for the whole control
                             now that the group draws no ring, and an unclamped
                             index matches nothing once six digits are in — so
                             focus vanished exactly when the code was complete.
                             Clamping keeps one active box at every length. */
                          (i === Math.min(code.length, CODE_LENGTH - 1) ? ' next' : '')
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
              aria-busy={working === 'verify' || undefined}
              data-held={held(working === 'verify', code.length < CODE_LENGTH)}
            >
              {busy ? t('auth.checking') : t('auth.verify')}
            </button>

            {/* Spoken as well as shown: pressing "send it again" otherwise
                changes nothing a screen reader can hear, and the second press
                that follows is a second SMS the student did not need. */}
            <p className="auth-sent" role="status">
              {resent ? t(`auth.resentVia.${sentVia}`) : ''}
            </p>

            {/* Three ways to receive the code, offered side by side rather than
                escalated through.
                
                Not a fallback chain, because there is no order that is right
                for everybody: a deaf student needs voice never rather than
                third, someone on a feature phone cannot use WhatsApp at all,
                and a student whose SMS is being silently dropped by their
                operator needs WhatsApp first rather than after two more
                failures. The only person who knows which of these arrives is
                holding the phone, so all three are equal options and none is
                pre-selected.
                
                They share the resend countdown. It is one exchange on MSG91's
                side whichever road the code takes, and the timer exists to stop
                a student sending four messages while the first is still in
                flight — a purpose that does not change when the second one is
                a phone call. */}
            <div className="auth-retry">
              <span className="muted" id="retry-label">{t('auth.noCode')}</span>

              <div className="auth-channels" role="group" aria-labelledby="retry-label">
                <button
                  type="button"
                  className="quiet"
                  onClick={() => resend('sms')}
                  disabled={busy}
                  aria-busy={working === 'sms' || undefined}
                  data-held={held(working === 'sms')}
                >
                  {t('auth.viaSms')}
                </button>
                <button
                  type="button"
                  className="quiet"
                  onClick={() => resend('whatsapp')}
                  disabled={busy}
                  aria-busy={working === 'whatsapp' || undefined}
                  data-held={held(working === 'whatsapp')}
                >
                  {t('auth.viaWhatsapp')}
                </button>
                <button
                  type="button"
                  className="quiet"
                  onClick={() => resend('voice')}
                  disabled={busy}
                  aria-busy={working === 'voice' || undefined}
                  data-held={held(working === 'voice')}
                >
                  {t('auth.viaVoice')}
                </button>
              </div>

              {/* The number, once, for the group — not repeated inside three
                  buttons that would then all say the same thing and read as
                  three separate waits to a screen reader.
                  *
                  * aria-live is deliberately absent: a value that changes every
                  * second would be announced every second, which is the whole
                  * screen read over and over to somebody trying to hear the
                  * field they are typing in. The buttons say what they do; this
                  * is for the eye. */}
              {secondsLeft > 0 && (
                <p className="muted auth-wait" aria-hidden="true">
                  {t('auth.resendIn', { n: secondsLeft })}
                </p>
              )}

            </div>
          </form>
        )}
      </div>
    </div>
  )
}
