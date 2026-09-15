/* Registration: one form, one screen, one press.
 *
 * This replaces the eleven-screen profile wizard, and the reasons it replaced
 * it are worth keeping because the wizard's own argument was a good one and it
 * lost to something it had not accounted for.
 *
 * The wizard's case was that a long form asking for a disability percentage, a
 * family income and a UDID number at once is what makes people abandon, so it
 * asked one question per screen and wrote a draft after every answer. What that
 * costs is a student who cannot see the shape of what is being asked. Eleven
 * screens with no way to look ahead reads as an interview of unknown length,
 * every answer is a commitment made blind, and going back to change the third
 * answer means pressing Back eight times. It also put registration and details
 * in two places — a code at /signin, then eleven questions at /profile/setup —
 * so the moment a student was actually registered was invisible to them.
 *
 * One form fixes the thing the wizard could not: the whole ask is visible
 * before the first keystroke. Nine questions, three named sections, and a
 * student can see that section three is the last one. The phone number and its
 * code sit inside the form rather than on a screen before it, so registering
 * and saying who you are is one action with one button at the end of it.
 *
 * What the wizard was right about is kept where it still applies: the controls
 * are large, nothing is denser than it has to be, and the questions are grouped
 * so that the sensitive ones are not mixed in with the ordinary ones. What is
 * deliberately dropped is the draft-per-answer machinery — there is no step to
 * resume from when there is only one step, and the answers are in the form.
 *
 * ---------------------------------------------------------------------------
 * The order of operations, which is not the order of the fields
 * ---------------------------------------------------------------------------
 *
 * The code has to be verified before the form can be submitted, because both
 * of the things submitting does need a session: POST /me/profile is behind the
 * auth middleware, and so is the document upload. So the phone block is the one
 * part of this form that acts on its own, mid-form, and it says so — it goes
 * quiet and reads "Verified" once it is done, and the submit button explains
 * itself while it is not.
 *
 * Submitting then does three things in a fixed order: create the profile,
 * upload the certificate, then leave. The upload is second rather than first
 * because /me/documents wants a profile to hang the document on, and it is not
 * allowed to fail the registration — a student whose profile saved and whose
 * PDF did not is registered, and telling them otherwise would send them round
 * the whole form again to fix a file. They are told about the file alone, and
 * the document vault is where it is retried.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useI18n } from '../lib/i18n-context'
import { useAnnounce } from '../lib/announce'
import { safeNext } from '../lib/next'
import { formatE164, type Channel } from '../lib/otp'
import {
  ALL_YEARS, PROGRAMS_GRADUATION, PROGRAMS_PG, PROGRAMS_TOP, PROGRAM_PHD,
  courseLevelFor, courseNameFor, disabilityChips, disabilityTypeFor, genderChoices,
  programCategory, stateChoices, yearLabel, yearOrdinal,
  type Choice,
} from '../lib/fields'
import { ChipSelector } from '../components/ChipSelector'
import { SearchableSelect } from '../components/SearchableSelect'
import { DistrictPicker } from '../components/DistrictPicker'
import { Field, Notice } from '../components/ui'
import type { Profile } from '../lib/types'

/* Same rule as the sign-in screen, checked here as well so the complaint can
 * land on the field being typed into rather than in a banner at the top. */
const MOBILE = /^[6-9]\d{9}$/
const CODE_LENGTH = 6
const RESEND_SECONDS = 30

/* 5 MB, and the three types a certificate actually arrives as. Checked on the
 * device rather than only at the API: a student on a slow connection should not
 * spend two minutes uploading a 12 MB camera photo to be told no at the end. */
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/* 98765 43210 — the grouping printed on a phone bill, so a number copied off a
 * document can be checked against its source in two glances rather than ten. */
function group(digits: string) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits
}

const asChoices = (values: readonly string[]): Choice[] =>
  values.map(v => ({ value: v, label: v }))

/* Two components, and the split exists to own one problem: seeding.
 *
 * A visitor arrives with no profile and the form must open empty. A student who
 * pressed "Update details" arrives with one and the form must open holding
 * their answers. The awkward case is the third — somebody opening /register?edit
 * from a bookmark, where the session is still being refreshed at mount, so the
 * profile is null for the first frame and arrives on a later one.
 *
 * Seeding that in an effect is the obvious move and it is the wrong one: it
 * paints nine empty controls, then fills them, so the form visibly rewrites
 * itself under the reader. Keying the inner component on the profile's id
 * instead means the arrival remounts it, and `useState` initialisers do the
 * seeding — one render, already correct, no effect. It also costs nothing for
 * the two common cases, which mount once and never re-key.
 *
 * The outer half deliberately does not gate on `status === 'loading'`. A
 * spinner here would put the public /register behind an API round trip for
 * every visitor, which is the exact five-second first paint App.tsx took the
 * session gate out to fix.
 */
export default function Register() {
  const { profile } = useAuth()
  return <RegisterForm key={profile?.profile_id ?? 'new'} profile={profile} />
}

function RegisterForm({ profile }: { profile: Profile | null }) {
  const { t } = useI18n()
  const {
    requestCode, submitCode, resendCode, cancelCode, clearError,
    status, pendingCode, error: authError, refreshProfile,
  } = useAuth()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const location = useLocation()

  /* Where finishing leads. The matched list normally, but a visitor who pressed
     Apply on a scholarship arrives with it in the address, and finishing hands
     them back to it rather than to a list they must search it out of again. */
  const destination = safeNext(location.search)

  const verified = status === 'authenticated'
  const awaitingCode = status === 'awaiting_code' && pendingCode

  const [name, setName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState(profile?.gender ?? '')
  const [udid, setUdid] = useState(profile?.udid_number ?? '')
  const [file, setFile] = useState<File | null>(null)
  /* One stored enum becomes a one-item selection. A profile saved as
     MULTIPLE_DISABILITIES reopens as that single chip rather than as the set it
     was folded from — the set was never stored, and guessing it back would be
     inventing an answer. disabilityTypeFor in lib/fields carries the whole
     argument for the fold. */
  const [disabilities, setDisabilities] = useState<string[]>(
    profile?.disability_type ? [profile.disability_type] : [],
  )
  const [percent, setPercent] = useState(
    profile?.disability_percent != null ? String(profile.disability_percent) : '',
  )
  const [state, setState] = useState(profile?.state_code ?? '')
  const [district, setDistrict] = useState(profile?.district ?? '')
  /* course_name holds the chip that was picked; the postgraduate ones are
     stored prefixed, and programCategory needs the prefix back to know which
     year chips apply. course_level is what says which group it came from. */
  const [program, setProgram] = useState(() => {
    if (!profile?.course_name) return ''
    return profile.course_level === 'POSTGRADUATE' && profile.course_name !== PROGRAM_PHD
      ? `PG: ${profile.course_name}`
      : profile.course_name
  })
  const [year, setYear] = useState(
    () => yearLabel(profile?.course_level, profile?.current_year) ?? '',
  )
  const [institution, setInstitution] = useState(profile?.institution_name ?? '')

  const [problems, setProblems] = useState<Record<string, string>>({})
  /* Which action is in flight, not merely that one is.
   *
   * A boolean cannot answer that, and the answer is what the styling needs:
   * the three resend channels sit beside Verify and are held by the same flag,
   * so a boolean would draw "working" on four controls at once and say nothing
   * about which one was pressed. The tag names the pressed control; `disabled`
   * still reads the derived boolean, because being held is still being held. */
  const [working, setWorking] = useState<'send' | 'verify' | 'save' | Channel | null>(null)
  const busy = working !== null

  /* Disabled because this button's own work is running, or only because some
   * other button's is? The second must not repaint — see the note on
   * :not([data-held]) in styles.css. `unavailable` is the button's own reason
   * to be off, the one the student can act on, and it always wins. */
  const held = (own: boolean, unavailable = false) =>
    (busy && !own && !unavailable) || undefined
  const [formError, setFormError] = useState<string | null>(null)
  const [fileWarning, setFileWarning] = useState<string | null>(null)
  const [sentVia, setSentVia] = useState<Channel>('sms')
  const [resent, setResent] = useState(false)
  /* Seconds since the last code went out, counted down from 30.
   *
   * A number to wait against, not a gate. It used to disable all three channels
   * while it ran, which is what took WhatsApp away from a student whose SMS had
   * been dropped — see the note beside the buttons. Every one stays pressable;
   * this only answers "has it been long enough to be worth trying again". */
  const [resentAt, setResentAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const phoneInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)


  useEffect(() => {
    if (!awaitingCode || resentAt === null) return
    const tick = () => setSecondsLeft(
      Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - resentAt) / 1000)),
    )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [awaitingCode, resentAt])

  /* Move to the code box the moment it appears, so the code can be typed
     straight from the notification without hunting for the field. */
  useEffect(() => {
    if (awaitingCode) codeInput.current?.focus()
  }, [awaitingCode])

  /* A student who already has a profile and came here by accident — /register is
     printed on outreach material and sits in browser histories — is not shown a
     form asking them to register again. Editing is deliberate and arrives with
     ?edit, which is what the profile view links to. */
  const editing = new URLSearchParams(location.search).has('edit')
  if (verified && profile && !editing) {
    return <Navigate to={destination} replace />
  }

  const category = programCategory(program)
  /* The years that do not belong to the chosen program are shown and disabled
     rather than removed — see ALL_YEARS in lib/fields for why the row does not
     change length. PhD has no year at all, so the whole question goes. */
  const yearsOff = category
    ? ALL_YEARS.filter(y => !y.cats.includes(category)).map(y => y.label)
    : []

  function clearProblem(key: string) {
    setProblems(p => (p[key] ? { ...p, [key]: '' } : p))
    if (formError) setFormError(null)
  }

  function changePhone(value: string) {
    /* The last ten digits of whatever arrives. A number pasted off a contact
       card comes with +91, or a leading 0, or dots between the groups, and none
       of those is a mistake the person pasting should have to clean up. */
    setPhone(value.replace(/\D/g, '').slice(-10))
    clearProblem('phone')
    if (authError) clearError()
  }

  async function sendCode() {
    if (!MOBILE.test(phone)) {
      setProblems(p => ({ ...p, phone: t(phone ? 'auth.phoneInvalid' : 'auth.phoneMissing') }))
      phoneInput.current?.focus()
      return
    }
    setWorking('send')
    try {
      await requestCode(phone)
      setResentAt(Date.now())
    } catch {
      /* the provider holds the message, and useAuth exposes it */
    } finally {
      setWorking(null)
    }
  }

  async function verify() {
    setWorking('verify')
    setResent(false)
    try {
      await submitCode(code)
      announce(t('reg.verified'))
    } catch {
      // Wrong or expired: clear the box so the next attempt is not typed on top
      // of the last one.
      setCode('')
      codeInput.current?.focus()
    } finally {
      setWorking(null)
    }
  }

  async function resend(channel: Channel) {
    setWorking(channel)
    setResent(false)
    try {
      await resendCode(channel)
      setResentAt(Date.now())
      setSentVia(channel)
      setResent(true)
    } catch {
      /* the provider holds the message */
    } finally {
      setWorking(null)
    }
  }

  function chooseFile(chosen: File | null) {
    setFileWarning(null)
    clearProblem('file')
    if (!chosen) {
      setFile(null)
      return
    }
    if (!ALLOWED_TYPES.includes(chosen.type)) {
      setProblems(p => ({ ...p, file: t('reg.fileType') }))
      setFile(null)
      return
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setProblems(p => ({ ...p, file: t('reg.fileSize') }))
      setFile(null)
      return
    }
    setFile(chosen)
  }

  /* Every rule in one place, so the button and the fields cannot disagree about
   * whether the form is ready. Returns the map rather than setting it, because
   * submit needs to know which field to move focus to and a state update is not
   * readable in the same tick. */
  function check(): Record<string, string> {
    const found: Record<string, string> = {}
    const required = t('reg.required')

    if (!name.trim()) found.name = required
    if (!gender) found.gender = required
    if (!verified) found.phone = t('reg.verifyFirst')
    if (!udid.trim()) found.udid = required
    /* Only on a first registration. An edit is re-opening a form whose
       certificate was uploaded the first time through, and demanding the file
       again to change a state code would be asking for the document twice. */
    if (!file && !profile) found.file = required
    if (disabilities.length === 0) found.disability = required

    const pct = Number(percent)
    if (percent === '') found.percent = required
    else if (!Number.isFinite(pct) || !Number.isInteger(pct) || pct < 0 || pct > 100) {
      found.percent = t('reg.percentRange')
    }

    if (!state) found.state = required
    /* Only once a state is chosen. Asking for a district while the control is
       still disabled would name a field the student cannot reach — two errors
       for one mistake, and the second one unactionable. */
    if (state && !district) found.district = required
    if (!program) found.program = required
    // PhD is the one program with no year to give.
    if (category !== 'phd' && !year) found.year = required
    if (!institution.trim()) found.institution = required

    return found
  }

  async function submit(e: FormEvent) {
    e.preventDefault()

    const found = check()
    if (Object.keys(found).length > 0) {
      /* Focus the first thing that is wrong, in document order rather than in
       * the order the checks happen to run. A summary at the top telling
       * somebody that four fields need attention, with no way to reach the
       * first of them, is the failure mode this avoids — and on a form three
       * thousand pixels tall it is the difference between a fixable error and
       * a hunt.
       *
       * flushSync, because the thing being searched for is drawn by the state
       * update on the line above it. aria-invalid reaches the DOM when React
       * commits, and React batches an update made inside an event handler to
       * after the handler returns — so the querySelector below ran against the
       * previous DOM, matched nothing, and focus stayed on the body. Nothing
       * about it looked broken: the errors all appeared correctly a frame
       * later, and only the focus silently did not move.
       *
       * A rAF or a zero timeout would also work and would be worse: both say
       * "wait a moment and hope", where this says which paint is being waited
       * for. The cost is one synchronous re-render on a path that has just
       * refused to submit, which is not a path worth optimising. */
      flushSync(() => {
        setProblems(found)
        setFormError(t('reg.fix'))
      })
      const first = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      /* Centred rather than scrolled to the top: the label and the hint sit
         above the control, and a field aligned to the top of the viewport puts
         both of them under the sticky masthead. */
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setProblems(found)

    setWorking('save')
    setFormError(null)
    setFileWarning(null)

    /* Only what was answered, and each in the type the API decodes it as.
     * disability_percent is *int and current_year is *int on UpsertInput; a
     * string in either fails to decode before any handler runs, and the reply
     * is the generic "We could not read that request" naming no field. */
    const payload: Record<string, unknown> = {
      full_name: name.trim(),
      disability_type: disabilityTypeFor(disabilities),
      disability_percent: Number(percent),
      udid_number: udid.trim(),
      state_code: state,
      district: district.trim(),
      course_level: courseLevelFor(program),
      course_name: courseNameFor(program),
      institution_name: institution.trim(),
    }
    const ordinal = yearOrdinal(year)
    if (ordinal !== null) payload.current_year = ordinal
    // Only when answered. An empty string is not one of the four the API
    // accepts, and sending it fails the whole form on a question nobody has to
    // answer.
    if (gender) payload.gender = gender

    /* Email is asked for and not sent, and that is a gap rather than a
     * decision. There is no email column on student_profile and no field for it
     * on profile.UpsertInput, so there is nowhere for it to go — sending it
     * would be silently dropped by the decoder. It is on the form because the
     * design asks for it and because a student who gives it should not have to
     * give it again once the column exists. Until then it lives for the length
     * of this page and no longer, which is worth knowing before somebody
     * concludes the address is on file. */
    void email

    try {
      if (profile) {
        await api.request('/me/profile', { method: 'PATCH', body: payload })
      } else {
        await api.post('/me/profile', payload)
      }

      /* Second, and allowed to fail on its own. /me/documents needs the profile
         the call above just created, and a certificate that does not upload
         must not un-register a student whose details saved. */
      if (file) {
        const body = new FormData()
        body.append('file', file)
        body.append('doc_type', 'UDID_CARD')
        try {
          // FormData rather than the JSON client: the browser has to set its own
          // multipart boundary, which it cannot do if a Content-Type is forced.
          await api.upload('/me/documents', body)
        } catch {
          setFileWarning(t('reg.fileLater'))
        }
      }

      await refreshProfile()
      announce(t('reg.done'))
      /* Held on the page when the certificate did not go up, so the sentence
         about it is read rather than flashed on the way out. */
      if (!fileWarning) navigate(destination)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="page register-page">
      <div className="register-card">
        <h1>{profile ? t('reg.editTitle') : t('reg.title')}</h1>
        <p className="register-sub">
          {/* One sentence for everybody. It was split in two — an aria-hidden
              line about asterisks and a sr-only line stating the real rule —
              which is two conventions to keep true instead of one, and only the
              hidden half was right. Nothing here needs hiding now. */}
          {t('reg.requiredNote')}
        </p>

        {authError && <Notice tone="danger">{authError}</Notice>}
        {formError && <Notice tone="danger">{formError}</Notice>}
        {fileWarning && (
          <Notice tone="warn" title={t('reg.doneTitle')}>
            <p>{fileWarning}</p>
            <p><Link to="/documents">{t('doc.upload')}</Link></p>
          </Notice>
        )}

        <form ref={form} onSubmit={submit} noValidate>
          <h2 className="register-section">{t('reg.personal')}</h2>

          <Field label={t('reg.name')} error={problems.name || undefined} required>
            {props => (
              <input
                {...props}
                type="text"
                autoComplete="name"
                placeholder={t('reg.namePlaceholder')}
                value={name}
                onChange={e => { setName(e.target.value); clearProblem('name') }}
              />
            )}
          </Field>

          {/* The one block that acts before the form is submitted. */}
          {verified ? (
            <p className="register-verified">
              <span className="mark" aria-hidden="true">✓</span>
              <span>
                {t('reg.verified')}
                {pendingCode && <> — <span className="number">{formatE164(pendingCode.phone)}</span></>}
              </span>
            </p>
          ) : (
            <Field
              label={t('auth.phone')}
              hint={awaitingCode ? undefined : t('reg.phoneHint')}
              error={problems.phone || undefined}
              required
            >
              {props => (
                <>
                  <div className="phone-otp">
                    {/* The country code is fixed furniture rather than a
                        prefilled "+91" to be typed around or deleted by
                        accident. */}
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
                        disabled={Boolean(awaitingCode)}
                        value={group(phone)}
                        onChange={e => changePhone(e.target.value)}
                      />
                    </span>
                    {!awaitingCode && (
                      <button type="button" className="primary" onClick={sendCode} disabled={busy} aria-busy={working === 'send' || undefined}>
                        {busy ? t('auth.sending') : t('reg.sendOtp')}
                      </button>
                    )}
                  </div>

                  {awaitingCode && (
                    <div className="otp-step">
                      <p className="otp-target">
                        <span className="number">{formatE164(pendingCode.phone)}</span>
                        <button
                          type="button"
                          className="quiet small"
                          onClick={() => { cancelCode(); setCode('') }}
                          disabled={busy}
                          data-held={held(false)}
                        >
                          {t('auth.changeNumber')}
                        </button>
                      </p>

                      <div className="phone-otp">
                        <input
                          ref={codeInput}
                          type="text"
                          /* one-time-code lets the phone offer the digits
                             straight from the message, which saves the
                             copy-paste most likely to go wrong. */
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={CODE_LENGTH}
                          className="otp-input"
                          aria-label={t('auth.code')}
                          placeholder={t('reg.otpPlaceholder')}
                          value={code}
                          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                        />
                        <button
                          type="button"
                          className="primary"
                          onClick={verify}
                          disabled={busy || code.length < CODE_LENGTH}
                          aria-busy={working === 'verify' || undefined}
                          data-held={held(working === 'verify', code.length < CODE_LENGTH)}
                        >
                          {busy ? t('auth.checking') : t('auth.verify')}
                        </button>
                      </div>

                      {/* Spoken as well as shown: pressing a resend otherwise
                          changes nothing a screen reader can hear, and the
                          second press that follows is a second message nobody
                          needed. */}
                      <p className="otp-sent" role="status">
                        {resent ? t(`auth.resentVia.${sentVia}`) : ''}
                      </p>

                      {/* Three ways, side by side rather than escalated
                          through. A deaf student needs voice never rather than
                          third, and somebody whose operator is dropping SMS
                          needs WhatsApp first rather than after two more
                          failures. They share one countdown because it is one
                          exchange on MSG91's side whichever road the code
                          takes. */}
                      <div className="otp-retry">
                        <span className="muted" id="reg-retry">{t('auth.noCode')}</span>
                        <div className="otp-channels" role="group" aria-labelledby="reg-retry">
                          <button type="button" className="quiet" onClick={() => resend('sms')} disabled={busy} aria-busy={working === 'sms' || undefined} data-held={held(working === 'sms')}>{t('auth.viaSms')}</button>
                          <button type="button" className="quiet" onClick={() => resend('whatsapp')} disabled={busy} aria-busy={working === 'whatsapp' || undefined} data-held={held(working === 'whatsapp')}>{t('auth.viaWhatsapp')}</button>
                          <button type="button" className="quiet" onClick={() => resend('voice')} disabled={busy} aria-busy={working === 'voice' || undefined} data-held={held(working === 'voice')}>{t('auth.viaVoice')}</button>
                        </div>
                        {/* aria-hidden: a value that changes every second would
                            be announced every second, over the field being
                            typed in. The buttons say what they do; this is for
                            the eye. */}
                        {secondsLeft > 0 && (
                          <p className="muted auth-wait" aria-hidden="true">
                            {t('auth.resendIn', { n: secondsLeft })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Field>
          )}

          <Field label={t('reg.email')} hint={t('reg.emailHint')} required={false}>
            {props => (
              <input
                {...props}
                type="email"
                autoComplete="email"
                placeholder={t('reg.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            )}
          </Field>

          {/* Chips rather than a select, and four of them fit one row.
              *
              * Asked because the matching engine asks for it: a women-only
              * scheme is a rule on this field, and a profile without it is told
              * "Add your gender to your profile" as its top next step. Until
              * now that instruction pointed at a control that did not exist
              * anywhere in the app.
              *
              * Not marked required. The API does not require it, and a question
              * about gender that cannot be passed is the wrong thing to put in
              * front of this audience — "Prefer not to say" is a stored answer
              * that stops the matcher asking again, which is the honest way to
              * let somebody decline. */}
          <div className="field">
            <span className="field-label" id="reg-gender">
              {t('reg.gender')}
              {/* Required, and checked as such — a star that does not stop a
                  submission is the same broken promise as a sentence describing
                  a star that is not there. "Prefer not to say" is why asking can
                  be compulsory without compelling a disclosure: it is a stored
                  answer that stops the matcher asking again, so nobody has to
                  give a fact about themselves to get past this question. */}
              <span className="req" aria-hidden="true"> *</span>
              <span className="sr-only"> ({t('common.required')})</span>
              <span className="hint"> {t('reg.genderHint')}</span>
            </span>
            <ChipSelector
              legend={t('reg.gender')}
              name="gender"
              options={genderChoices()}
              selected={gender ? [gender] : []}
              onChange={v => { setGender(v[0] ?? ''); clearProblem('gender') }}
            />
            {problems.gender && (
              <span className="error" role="alert">{problems.gender}</span>
            )}
          </div>

          <h2 className="register-section">{t('reg.disability')}</h2>

          <Field label={t('reg.udid')} hint={t('reg.udidHint')} error={problems.udid || undefined} required>
            {props => (
              <input
                {...props}
                type="text"
                placeholder={t('reg.udidPlaceholder')}
                value={udid}
                onChange={e => { setUdid(e.target.value); clearProblem('udid') }}
              />
            )}
          </Field>

          <Field
            label={t('reg.certificate')}
            hint={t('reg.certificateHint')}
            error={problems.file || undefined}
            required={!profile}
          >
            {props => (
              <input
                {...props}
                ref={fileInput}
                type="file"
                className="file-input"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                // capture is deliberately absent: offering the camera by
                // default is wrong for somebody who has already scanned the
                // certificate, and the picker offers the camera anyway.
                onChange={e => chooseFile(e.target.files?.[0] ?? null)}
              />
            )}
          </Field>

          {/* Not a Field: the control is a group of twenty-one chips with its
              own <legend>, and Field's <label for> would have nothing single to
              point at. The label is rendered here and the group names itself. */}
          <div className="field">
            <span className="field-label" id="reg-disability">
              {t('reg.disabilityType')}
              {/* Both marks, and each is for one audience. The star is the one the
                  sentence at the top of the form promises, and it is aria-hidden
                  because "star" is not a word anybody needs read to them. The
                  sr-only "(required)" is what replaces it in the accessible
                  name — Field's inputs also carry the native `required`, but a
                  chip group has nothing to carry it. */}
              <span className="req" aria-hidden="true"> *</span>
              <span className="sr-only"> ({t('common.required')})</span>
              <span className="hint"> {t('reg.selectAll')}</span>
            </span>
            <ChipSelector
              legend={`${t('reg.disabilityType')} — ${t('reg.selectAll')}`}
              name="disability"
              options={disabilityChips()}
              selected={disabilities}
              multi
              onChange={v => { setDisabilities(v); clearProblem('disability') }}
            />
            {problems.disability && (
              <span className="error" role="alert">{problems.disability}</span>
            )}
          </div>

          <Field
            label={t('reg.percent')}
            hint={t('reg.percentHint')}
            error={problems.percent || undefined}
            required
          >
            {props => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                className="input-short"
                // step 1 so the spinner moves in whole numbers and a phone
                // keypad offers no decimal point: disability_percent is an int
                // on the API, and 40.5 fails to decode.
                step={1}
                min={0}
                max={100}
                placeholder={t('reg.percentPlaceholder')}
                value={percent}
                onChange={e => { setPercent(e.target.value); clearProblem('percent') }}
              />
            )}
          </Field>

          <h2 className="register-section">{t('reg.education')}</h2>

          <Field label={t('reg.state')} error={problems.state || undefined} required>
            {props => (
              <SearchableSelect
                {...props}
                options={stateChoices()}
                value={state}
                /* Changing the state clears the district: the districts
                   belonged to the old one, and a Kerala student who corrects
                   their state to Karnataka must not keep Wayanad. */
                onChange={v => {
                  setState(v)
                  setDistrict('')
                  clearProblem('state')
                  // The old district is gone, so its error is stale too.
                  clearProblem('district')
                }}
                placeholder={t('reg.statePlaceholder')}
              />
            )}
          </Field>

          {/* Required. Fourteen states' lists are cut short in the data file,
              so the picker lets those states type a district instead — see
              DistrictPicker. Without that escape, requiring this would stop a
              student from Lucknow registering at all. */}
          <Field
            label={t('reg.district')}
            hint={t('reg.districtHint')}
            error={problems.district || undefined}
            required
          >
            {props => (
              <DistrictPicker
                id={props.id}
                stateCode={state}
                value={district}
                onChange={v => { setDistrict(v); clearProblem('district') }}
                describedBy={props['aria-describedby']}
                invalid={!!problems.district}
              />
            )}
          </Field>

          <div className="field">
            <span className="field-label" id="reg-program">
              {t('reg.program')}
              {/* Both marks, and each is for one audience. The star is the one the
                  sentence at the top of the form promises, and it is aria-hidden
                  because "star" is not a word anybody needs read to them. The
                  sr-only "(required)" is what replaces it in the accessible
                  name — Field's inputs also carry the native `required`, but a
                  chip group has nothing to carry it. */}
              <span className="req" aria-hidden="true"> *</span>
              <span className="sr-only"> ({t('common.required')})</span>
            </span>

            {/* Three groups and a single answer across all of them. The
                headings are headings rather than selectable chips, because
                "Graduation" is not a program somebody is enrolled on — and a
                chip that looks identical to its neighbours and does nothing
                when pressed is worse than a word that never looked pressable. */}
            <ChipSelector
              legend={t('reg.program')}
              name="program"
              options={asChoices(PROGRAMS_TOP)}
              selected={program ? [program] : []}
              onChange={v => { setProgram(v[0] ?? ''); setYear(''); clearProblem('program') }}
            />

            <p className="chip-heading">{t('reg.graduation')}</p>
            <ChipSelector
              legend={t('reg.graduation')}
              name="program"
              options={asChoices(PROGRAMS_GRADUATION)}
              selected={program ? [program] : []}
              onChange={v => { setProgram(v[0] ?? ''); setYear(''); clearProblem('program') }}
            />

            <p className="chip-heading">{t('reg.postgraduation')}</p>
            <ChipSelector
              legend={t('reg.postgraduation')}
              name="program"
              /* Stored prefixed — "Others" is in both grouped lists and MD is a
                 postgraduate degree, so the label alone cannot say which group
                 an answer came from. See pgValue in lib/fields. */
              options={PROGRAMS_PG.map(p => ({ value: `PG: ${p}`, label: p }))}
              selected={program ? [program] : []}
              onChange={v => { setProgram(v[0] ?? ''); setYear(''); clearProblem('program') }}
            />

            <p className="chip-heading sr-only">{PROGRAM_PHD}</p>
            <ChipSelector
              legend={PROGRAM_PHD}
              name="program"
              options={asChoices([PROGRAM_PHD])}
              selected={program ? [program] : []}
              onChange={v => { setProgram(v[0] ?? ''); setYear(''); clearProblem('program') }}
            />

            {problems.program && <span className="error" role="alert">{problems.program}</span>}
          </div>

          {/* PhD has no year to give, so the question goes rather than sitting
              there with every chip greyed out. */}
          {category !== 'phd' && (
            <div className="field">
              <span className="field-label" id="reg-year">
                {t('reg.year')}
                {/* Both marks, and each is for one audience. The star is the one the
                    sentence at the top of the form promises, and it is aria-hidden
                    because "star" is not a word anybody needs read to them. The
                    sr-only "(required)" is what replaces it in the accessible
                    name — Field's inputs also carry the native `required`, but a
                    chip group has nothing to carry it. */}
                <span className="req" aria-hidden="true"> *</span>
                <span className="sr-only"> ({t('common.required')})</span>
                {!program && <span className="hint"> {t('reg.yearAfterProgram')}</span>}
              </span>
              <ChipSelector
                legend={t('reg.year')}
                name="year"
                options={ALL_YEARS.map(y => ({ value: y.label, label: y.label }))}
                selected={year ? [year] : []}
                disabledValues={yearsOff}
                onChange={v => { setYear(v[0] ?? ''); clearProblem('year') }}
              />
              {problems.year && <span className="error" role="alert">{problems.year}</span>}
            </div>
          )}

          <Field label={t('reg.institution')} error={problems.institution || undefined} required>
            {props => (
              <input
                {...props}
                type="text"
                placeholder={t('reg.institutionPlaceholder')}
                value={institution}
                onChange={e => { setInstitution(e.target.value); clearProblem('institution') }}
              />
            )}
          </Field>

          {/* Held by its own save, not by the OTP exchange happening above it.
              `busy` here would have covered both, and both are on screen at
              once until the number is verified — so pressing "Send OTP" turned
              this button grey for the length of an SMS round trip, which is the
              blink this whole state split exists to remove, on the largest
              control on the page.

              Nothing is lost by leaving it pressable meanwhile: an unverified
              submit is already refused in words by the note below and by
              submit() itself, which is the deliberate choice recorded there —
              a button that cannot be pressed and does not say why is where
              forms get abandoned. */}
          <button type="submit" className="primary wide register-cta" disabled={working === 'save'} aria-busy={working === 'save' || undefined}>
            {busy ? t('reg.saving') : profile ? t('reg.saveChanges') : t('reg.cta')}
          </button>

          {/* Said in words rather than only by a disabled button, because a
              button that cannot be pressed and does not say why is the single
              most common reason a form is abandoned at the last step. */}
          {!verified && (
            <p className="register-gate">
              <span className="mark" aria-hidden="true">!</span>
              <span>{t('reg.verifyFirst')}</span>
            </p>
          )}
        </form>

        {!verified && (
          <p className="register-alt">
            {t('reg.already')} <Link to="/signin">{t('reg.login')}</Link>
          </p>
        )}
      </div>
    </div>
  )
}
