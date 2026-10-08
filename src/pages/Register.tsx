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
import { usePageTitle } from '../lib/page-title'
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
import { SCALES, marksProblem, scaleOf, toPercent, type ScaleId } from '../lib/questions'
import { money } from '../lib/format'
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

/* The year answer for a student who has finished the course — not one of
   ALL_YEARS, since it is no year of study. Kept apart from their labels so it
   can never collide with one. */
const YEAR_DONE = 'COMPLETED'

/* Years of passing offered, newest first: this year and the fifteen before it.
   Far enough back for a student returning to study after a long gap; a year
   earlier than that is outside what any scheme here asks about. */
const PASS_YEARS = Array.from({ length: 16 }, (_, i) => String(new Date().getFullYear() - i))

/* Three steps, from the design Rakesh drew and Sarita and Sandeep approved
 * (2026-10-05): about you, eligibility, then a review of both before anything
 * is sent.
 *
 * Not the eleven-screen wizard back again, and the header's argument against it
 * still holds — this is what answers it. The rail beside the form names all
 * three steps from the first moment, so the length of the ask is visible before
 * the first keystroke, which is what the wizard could not do. And going back is
 * one press of Edit on the review rather than Back eight times.
 *
 * What the steps add that one long page did not is a place to stop and check.
 * On one page the only check was the submit button, and a mistake in the second
 * question surfaced as a summary three thousand pixels away from it. Each step
 * is checked as it is left, so a problem is met beside the questions it is about.
 *
 * Every question the one page asked is still asked; Rakesh's design was drawn
 * from a shorter list, and the state, income and marks it leaves out are what
 * most schemes match on. They are placed into the design's steps instead. */
type Step = 1 | 2 | 3

/* Which step each answer lives on, in the order they appear on screen — the
   error summary lists them in this order, so it reads top to bottom the way the
   form does rather than in the order the checks happen to run. */
const STEP_OF: Record<string, Step> = {
  name: 1, phone: 1, gender: 1,
  udid: 2, file: 2, disability: 2, percent: 2,
  state: 2, district: 2, program: 2, programOther: 2, year: 2, passYear: 2,
  marks: 2, institution: 2,
  declaration: 3,
}

/* The problems that belong to one step. */
function onStep(found: Record<string, string>, step: Step): Record<string, string> {
  return Object.fromEntries(Object.entries(found).filter(([k]) => STEP_OF[k] === step))
}

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
  /* Whether a disability certificate or UDID card is already held, from the
     profile's uploaded_documents (backend 0071). An API older than that sends
     no list, and then an existing profile is taken to hold one, as this form
     always assumed — so the form never demands a file the server cannot say
     it is missing. */
  const proofOnFile = profile
    ? (profile.uploaded_documents ?? ['DISABILITY_CERTIFICATE'])
        .some(d => d === 'DISABILITY_CERTIFICATE' || d === 'UDID_CARD')
    : false
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
  /* Which certificate the student holds. A UDID card is not the only proof of
     disability a scholarship accepts: many students still hold the older
     certificate a medical board issued — AIIMS, a district hospital — and
     requiring a UDID number turned them away at the first question. The UDID
     number is asked only of those who have one; the API has never required it.
     An edit opens on UDID when a number is stored, and on the medical
     certificate when one is not. */
  const [certKind, setCertKind] = useState<'UDID' | 'MEDICAL'>(
    profile && !profile.udid_number ? 'MEDICAL' : 'UDID',
  )
  const [file, setFile] = useState<File | null>(null)
  /* The student's photograph, optional (2026-10-05). Asked here with the
     certificate because it is the other document every application uses, so
     it is uploaded once rather than met for the first time on an Apply page. */
  const [photo, setPhoto] = useState<File | null>(null)
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
    const name = profile?.course_name
    if (!name) return ''
    if (name === PROGRAM_PHD) return name
    const pg = profile.course_level === 'POSTGRADUATE'
    const known: readonly string[] = pg ? PROGRAMS_PG : [...PROGRAMS_TOP, ...PROGRAMS_GRADUATION]
    // A name that is none of the options is one the student typed under Others.
    const option = known.includes(name) ? name : 'Others'
    return pg ? `PG: ${option}` : option
  })
  /* The program's name, typed, when it is none of the ones listed — B.Voc, LLB,
     BDS, a diploma's own title. "Others" alone told a sponsor nothing, and
     course_name is free text in the API, so what is typed is what is stored. */
  const [programOther, setProgramOther] = useState(() => {
    const name = profile?.course_name ?? ''
    const known: readonly string[] = [...PROGRAMS_TOP, ...PROGRAMS_GRADUATION, ...PROGRAMS_PG, PROGRAM_PHD]
    return name && !known.includes(name) ? name : ''
  })
  const isOther = courseNameFor(program) === 'Others'
  const [year, setYear] = useState(
    () => profile?.graduation_year
      ? YEAR_DONE
      : yearLabel(profile?.course_level, profile?.current_year) ?? '',
  )
  /* The year of passing, when the answer to "which year" is that the course is
     finished. Stored in its own column (0065) rather than as a year of study. */
  const [passYear, setPassYear] = useState(
    profile?.graduation_year ? String(profile.graduation_year) : '',
  )
  const [institution, setInstitution] = useState(profile?.institution_name ?? '')
  /* Last exam marks, on whichever scale the marksheet uses. The API stores a
     percentage and only that (academic_percentage), so a CGPA is converted on
     the way out by lib/questions' toPercent — the one conversion the profile
     question also uses, so a CGPA means the same number wherever it is typed.
     An edit opens on the stored percentage, since the scale it was first given
     on is not stored. */
  /* The family's yearly income, in whole rupees, as digits only — the input
     drops anything else as it is typed, so "2,50,000" from habit is 250000
     here. Optional, for the reason marks are: a scheme with an income ceiling
     reads a missing answer as "one step away" rather than refusing. */
  const [income, setIncome] = useState(
    profile?.annual_family_income != null ? String(Math.round(profile.annual_family_income)) : '',
  )
  const [marksScale, setMarksScale] = useState<ScaleId>('PERCENT')
  const [marks, setMarks] = useState(
    profile?.academic_percentage != null ? String(profile.academic_percentage) : '',
  )

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

  const [step, setStep] = useState<Step>(1)
  /* Whether the summary of problems is showing. Opened by a refused Continue,
     and it empties itself as each problem is fixed — the list is read from
     `problems` rather than copied, so it cannot go on naming a field that is
     already right. */
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [declared, setDeclared] = useState(false)

  const phoneInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const summary = useRef<HTMLDivElement>(null)
  const stepHeads = useRef<(HTMLHeadingElement | null)[]>([])

  /* The tab names the step as well as the page (2.4.2): "Step 2 of 3" is what a
     screen reader user switching back to this tab needs to hear, and a title
     that stayed "Register" for all three steps would not say it. */
  usePageTitle(`${t(`reg.step${step}`)} · ${t(profile ? 'reg.editTitle' : 'reg.title')}`)


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
    if (!verified) found.phone = t('reg.verifyToContinue')
    if (certKind === 'UDID' && !udid.trim()) found.udid = required
    /* Required until one is on file — not "on a first registration", which is
       what this was. That rule assumed a profile meant a certificate, and it
       did not: the upload runs after the profile saves and is allowed to fail
       on its own, so a student whose upload failed reopened this form to find
       the one document the score needs marked optional. Once a certificate or
       UDID card is held, the field is satisfied and an edit to a state code
       does not ask for it twice. */
    if (!file && !proofOnFile) found.file = required
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
    if (isOther && !programOther.trim()) found.programOther = required
    // PhD is the one program with no year to give.
    if (category !== 'phd' && !year) found.year = required
    if (year === YEAR_DONE && !passYear) found.passYear = required
    if (!institution.trim()) found.institution = required
    // Optional, so only a number that cannot be right is a problem.
    const marksBad = marksProblem(scaleOf(marksScale), marks.trim())
    if (marksBad) found.marks = marksBad
    if (!declared) found.declaration = t('reg.declarationMissing')

    return found
  }

  /* Moves to a step and puts focus on its heading.
   *
   * Focus has to move, or a screen reader user presses Continue and hears
   * nothing: the button they pressed is on a section that has just been hidden,
   * and focus falls to the body. The heading is the right place to land because
   * it says "Step 2 of 3, Eligibility" — where they are and how far there is to
   * go — and the next Tab reaches the first question.
   *
   * flushSync, because the heading being focused is in a section the state
   * update un-hides. A hidden element cannot take focus, and React batches an
   * update made in an event handler until after the handler returns, so without
   * it the focus call ran against the old DOM and silently did nothing. */
  function goTo(next: Step) {
    flushSync(() => {
      setStep(next)
      setSummaryOpen(false)
      setFormError(null)
    })
    const head = stepHeads.current[next - 1]
    head?.focus()
    head?.scrollIntoView({ block: 'start' })
  }

  /* Refuses to leave a step, and says why in one place.
   *
   * The summary takes focus rather than the first wrong field. Landing on a
   * field tells a screen reader user about that one problem and leaves them to
   * find the other three by tabbing; the summary reads the count and every
   * problem in order, each a link to its field — the pattern GOV.UK's forms
   * settled on after testing it with exactly this audience. */
  function refuse(found: Record<string, string>) {
    flushSync(() => {
      setProblems(found)
      setSummaryOpen(true)
    })
    summary.current?.focus()
    summary.current?.scrollIntoView({ block: 'start' })
  }

  /* Puts focus on the control a summary link names.
   *
   * By data-field rather than by id, because Field mints its ids with useId and
   * a chip group or the district picker has no single control to own one. The
   * first enabled control under the marker wins: the phone question's number
   * box is disabled while a code is pending, and the code box is then the one
   * to type into. Centred, so the label and hint above it are not left under
   * the sticky masthead. */
  function focusField(key: string) {
    const marked = form.current?.querySelectorAll<HTMLElement>(`[data-field="${key}"]`) ?? []
    const target = [...marked]
      .map(el => el.matches('input, select, textarea, button')
        ? el
        : el.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea, button:not([disabled])'))
      .find(el => el && !(el as HTMLInputElement).disabled)
    target?.focus()
    target?.scrollIntoView({ block: 'center' })
  }

  function next() {
    const found = onStep(check(), step)
    if (Object.keys(found).length > 0) {
      refuse(found)
      return
    }
    setProblems({})
    goTo((step + 1) as Step)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()

    /* Enter in the code box means "check this code", not "next step": the
       form's only submit button is Continue, and a student who types six digits
       and presses Enter has not finished the page. */
    if (step === 1 && awaitingCode && document.activeElement === codeInput.current) {
      if (code.length === CODE_LENGTH) void verify()
      return
    }
    if (step < 3) {
      next()
      return
    }

    const found = check()
    if (Object.keys(found).length > 0) {
      /* Each step was checked on the way out of it, so a problem here is
         normally the declaration alone. One from an earlier step — a session
         that expired between steps, say — sends the student back to it, since
         the summary's links cannot reach a field on a hidden step. */
      const earliest = Math.min(...Object.keys(found).map(k => STEP_OF[k] ?? 3)) as Step
      if (earliest !== step) goTo(earliest)
      refuse(onStep(found, earliest))
      return
    }
    setProblems(found)

    setWorking('save')
    setFormError(null)

    /* Only what was answered, and each in the type the API decodes it as.
     * disability_percent is *int and current_year is *int on UpsertInput; a
     * string in either fails to decode before any handler runs, and the reply
     * is the generic "We could not read that request" naming no field. */
    const payload: Record<string, unknown> = {
      full_name: name.trim(),
      disability_type: disabilityTypeFor(disabilities),
      disability_percent: Number(percent),
      // Only for a UDID holder; an empty string would be stored as a number.
      ...(certKind === 'UDID' && udid.trim() ? { udid_number: udid.trim() } : {}),
      state_code: state,
      district: district.trim(),
      course_level: courseLevelFor(program),
      course_name: isOther ? programOther.trim() : courseNameFor(program),
      institution_name: institution.trim(),
    }
    const ordinal = yearOrdinal(year)
    if (ordinal !== null) payload.current_year = ordinal
    // Finished: the year of passing, and no year of study — the API clears one
    // when the other is set.
    if (year === YEAR_DONE && passYear) payload.graduation_year = Number(passYear)
    // Only when answered. An empty string is not one of the four the API
    // accepts, and sending it fails the whole form on a question nobody has to
    // answer.
    if (gender) payload.gender = gender
    // Only when answered. A number, which is what the API decodes it as.
    if (income !== '') payload.annual_family_income = Number(income)
    // Only when answered, and always as the percentage the column holds.
    if (marks.trim() !== '' && !marksProblem(scaleOf(marksScale), marks.trim())) {
      payload.academic_percentage = toPercent(Number(marks), scaleOf(marksScale))
    }

    /* Email is asked for and not sent, and that is a gap rather than a
     * decision. There is no email column on student_profile and no field for it
     * on profile.UpsertInput, so there is nowhere for it to go — sending it
     * would be silently dropped by the decoder. It is on the form because the
     * design asks for it and because a student who gives it should not have to
     * give it again once the column exists. Until then it lives for the length
     * of this page and no longer, which is worth knowing before somebody
     * concludes the address is on file. */
    void email

    let uploadFailed = false
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
        // Filed as what it is, so the vault and a verifier see a UDID card or
        // a medical board's certificate rather than one label for both.
        body.append('doc_type', certKind === 'UDID' ? 'UDID_CARD' : 'DISABILITY_CERTIFICATE')
        try {
          // FormData rather than the JSON client: the browser has to set its own
          // multipart boundary, which it cannot do if a Content-Type is forced.
          await api.upload('/me/documents', body)
        } catch {
          uploadFailed = true
        }
      }

      // The photograph the same way, and allowed to fail the same way.
      if (photo) {
        const body = new FormData()
        body.append('file', photo)
        body.append('doc_type', 'PHOTOGRAPH')
        try {
          await api.upload('/me/documents', body)
        } catch {
          uploadFailed = true
        }
      }

      /* A file that did not go up, said where it will be seen.

         It used to be held on this page, and for a new registration it never
         was: refreshProfile gives the session a profile, Register re-keys on
         that profile's id and remounts this form with fresh state, and the
         remount's "already registered" redirect leaves before a warning can
         draw. So a failed upload now goes to My documents — the one place it
         can be retried — with the reason as a warning toast, which the
         Announcer holds across the navigation and also speaks. An edit
         (profile already present, nothing re-keys) is the same, for the same
         reason: the fix is in the documents, not in this form. */
      if (uploadFailed) {
        announce(t('reg.fileLater'), 'warn')
        await refreshProfile()
        navigate('/documents')
        return
      }
      await refreshProfile()
      announce(t('reg.done'))
      navigate(destination)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setWorking(null)
    }
  }

  /* What each problem is called in the summary — the question's own words, so
     a link reads "Full name: This one is needed" and lands on the box with that
     label. */
  const fieldNames: Record<string, string> = {
    name: t('reg.name'),
    phone: t('auth.phone'),
    gender: t('reg.gender'),
    udid: t('reg.udid'),
    file: t(certKind === 'UDID' ? 'reg.certificate' : 'reg.medicalCertificate'),
    disability: t('reg.disabilityType'),
    percent: t('reg.percent'),
    state: t('reg.state'),
    district: t('reg.district'),
    program: t('reg.program'),
    programOther: t('reg.programOther'),
    year: t('reg.year'),
    passYear: t('reg.passYear'),
    marks: scaleOf(marksScale).field,
    institution: t('reg.institution'),
    declaration: t('reg.declarationLegend'),
  }
  const listed = Object.keys(STEP_OF).filter(k => problems[k])

  /* The heading each step opens with. Focusable from script only, so goTo can
     land on it; "Step 2 of 3" and the step's name are one heading, and so one
     announcement, rather than a caption read separately. */
  const stepHead = (n: Step) => (
    <h2
      id={`reg-step-${n}`}
      className="register-step-head"
      tabIndex={-1}
      ref={el => { stepHeads.current[n - 1] = el }}
    >
      <span className="register-eyebrow">{t('reg.stepOf', { n })}</span>
      <span className="sr-only">: </span>
      {t(`reg.step${n}`)}
    </h2>
  )

  /* The review's one row. An unanswered optional question says so in words
     rather than leaving a blank that reads as a value lost. */
  const row = (label: string, value: string | null | undefined) => (
    <div className="review-row">
      <dt>{label}</dt>
      <dd>{value ? value : <span className="muted">{t('reg.notGiven')}</span>}</dd>
    </div>
  )

  const choiceLabel = (choices: Choice[], value: string) =>
    choices.find(c => c.value === value)?.label ?? value
  const yearText = year === YEAR_DONE
    ? [t('reg.yearDone'), passYear].filter(Boolean).join(', ')
    : (() => { const y = ALL_YEARS.find(a => a.label === year); return y ? t(y.key) : '' })()
  const marksText = marks.trim() === ''
    ? ''
    : marksScale === 'PERCENT'
      ? `${marks.trim()}%`
      : `${marks.trim()} ${scaleOf(marksScale).label} (${toPercent(Number(marks), scaleOf(marksScale))}%)`

  return (
    <div className="page register-page">
      <div className="register-layout">
        {/* The rail. An ordered list, because the steps are a sequence and a
            screen reader saying "list, 3 items" is the length of the ask. Each
            step's state is said in words beside its mark — a tick, a filled
            number, an outlined one — so colour carries none of it (1.4.1). Not
            links: a step is reached by finishing the one before it, and Edit on
            the review is the way back. */}
        <nav className="register-rail" aria-label={t('reg.progress')}>
          <ol>
            {([1, 2, 3] as Step[]).map(n => {
              const where = n < step ? 'done' : n === step ? 'now' : 'later'
              return (
                <li key={n} className={`rail-step ${where}`} aria-current={n === step ? 'step' : undefined}>
                  <span className="rail-num" aria-hidden="true">{where === 'done' ? '✓' : n}</span>
                  <span className="rail-copy">
                    <strong>{t(`reg.step${n}`)}</strong>
                    <span className="rail-note">{t(`reg.step${n}Note`)}</span>
                    <span className="sr-only">
                      {' '}({t(where === 'done' ? 'reg.stepDone' : where === 'now' ? 'reg.stepNow' : 'reg.stepLater')})
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>

      <div className="register-card">
        <h1>{profile ? t('reg.editTitle') : t('reg.title')}</h1>
        <p className="register-sub">
          {/* One sentence for everybody. It was split in two — an aria-hidden
              line about asterisks and a sr-only line stating the real rule —
              which is two conventions to keep true instead of one, and only the
              hidden half was right. Nothing here needs hiding now. */}
          {/* The star drawn as the fields draw it, red, in every language —
              split on the glyph rather than on words, so a translation that
              moves the star mid-sentence keeps it marked. Not aria-hidden,
              unlike the fields' stars: here it is the word the sentence is
              about, and hiding it would read "marked with are required". */}
          {t('reg.requiredNote').split('*').map((part, i) => (
            <span key={i}>{i > 0 && <span className="req">*</span>}{part}</span>
          ))}
        </p>

        {authError && <Notice tone="danger">{authError}</Notice>}
        {formError && <Notice tone="danger">{formError}</Notice>}

        {/* Every problem on this step, in screen order, each a link to its
            field. Not role="alert": refuse() moves focus here, which reads it,
            and an alert as well would read it twice — over the per-field
            alerts that are already speaking. Gone once the list is empty. */}
        {summaryOpen && listed.length > 0 && (
          <div
            ref={summary}
            className="error-summary"
            tabIndex={-1}
            aria-labelledby="reg-summary-title"
          >
            <h2 id="reg-summary-title">{t('reg.summary', { n: listed.length })}</h2>
            <ul>
              {listed.map(k => (
                <li key={k}>
                  <a
                    href={`#field-${k}`}
                    onClick={e => { e.preventDefault(); focusField(k) }}
                  >
                    {fieldNames[k]}: {problems[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form ref={form} onSubmit={submit} noValidate>
          {/* hidden rather than unmounted: the certificate and photo inputs hold
              their chosen files in the DOM, and a step that unmounted them would
              show "no file chosen" on the way back while a file was still held. */}
          <section hidden={step !== 1} aria-labelledby="reg-step-1">
          {stepHead(1)}
          <h3 className="register-section">{t('reg.personal')}</h3>

          <Field label={t('reg.name')} error={problems.name || undefined} required>
            {props => (
              <input
                {...props}
                type="text"
                data-field="name"
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
                        data-field="phone"
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
                          data-field="phone"
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
          <div className="field" data-field="gender">
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
              options={genderChoices(t)}
              selected={gender ? [gender] : []}
              onChange={v => { setGender(v[0] ?? ''); clearProblem('gender') }}
            />
            {problems.gender && (
              <span className="error" role="alert">{problems.gender}</span>
            )}
          </div>

          {/* The family's yearly income, with the rupee as fixed furniture
              inside the box — the phone field's arrangement — so the number
              is typed without a symbol to type around. */}
          <Field
            label={t('q.annual_family_income')}
            hint={t('q.annual_family_income.help')}
          >
            {props => (
              <span className="input-group register-income">
                <span className="prefix" aria-hidden="true">₹</span>
                <input
                  {...props}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="250000"
                  value={income}
                  // Digits only, and no leading zeros. Nothing typed here can
                  // be negative or fractional, so the range check has nothing
                  // left to catch.
                  onChange={e => setIncome(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
                />
              </span>
            )}
          </Field>
          {/* The amount read back in lakh grouping. 250000 and 2500000 differ
              by one zero and a scholarship's ceiling, and a run of zeros is
              the easiest thing on a form to mistype. */}
          {income !== '' && (
            <p className="wizard-derived register-derived" aria-live="polite">
              <span className="mark" aria-hidden="true">=</span>
              <span>{money(Number(income))}</span>
            </p>
          )}

          <div className="register-actions">
            <span />
            <button type="submit" className="primary">{t('reg.continue')}</button>
          </div>
          {/* Why Continue will refuse, before it is pressed — the phone code is
              the one answer that cannot be typed, and the reason a student is
              held on this step. */}
          {!verified && (
            <p className="register-gate">
              <span className="mark" aria-hidden="true">!</span>
              <span>{t('reg.verifyToContinue')}</span>
            </p>
          )}
          </section>

          <section hidden={step !== 2} aria-labelledby="reg-step-2">
          {stepHead(2)}
          <h3 className="register-section">{t('reg.disability')}</h3>

          {/* Which certificate, first: it decides whether there is a UDID
              number to ask for and what the upload is. Two options, so two
              radios — a dropdown would hide one of them for no gain. */}
          <div className="field">
            <span className="field-label" id="reg-certkind">
              {t('reg.certKind')}
              <span className="req" aria-hidden="true"> *</span>
              <span className="sr-only"> ({t('common.required')})</span>
            </span>
            <ChipSelector
              legend={t('reg.certKind')}
              name="certkind"
              options={[
                { value: 'UDID', label: t('reg.certUdid') },
                { value: 'MEDICAL', label: t('reg.certMedical') },
              ]}
              selected={[certKind]}
              onChange={v => {
                if (v[0]) { setCertKind(v[0] as 'UDID' | 'MEDICAL'); clearProblem('udid') }
              }}
            />
            {/* Says which certificates count, under the choice it explains:
                the legacy certificate is the one a student is unsure about. */}
            <span className="hint">
              {t(certKind === 'UDID' ? 'reg.certUdidSub' : 'reg.certMedicalSub')}
            </span>
          </div>

          {certKind === 'UDID' && (
            <Field label={t('reg.udid')} hint={t('reg.udidHint')} error={problems.udid || undefined} required>
              {props => (
                <input
                  {...props}
                  type="text"
                  data-field="udid"
                  placeholder={t('reg.udidPlaceholder')}
                  value={udid}
                  onChange={e => { setUdid(e.target.value); clearProblem('udid') }}
                />
              )}
            </Field>
          )}

          <Field
            label={t(certKind === 'UDID' ? 'reg.certificate' : 'reg.medicalCertificate')}
            hint={proofOnFile ? t('reg.certificateOnFile') : t('reg.certificateHint')}
            error={problems.file || undefined}
            required
          >
            {props => (
              <input
                {...props}
                // Not required to the browser or a screen reader once one is
                // on file: the label's star says the profile needs it, the
                // hint says it has it, and an empty picker is not a gap.
                required={!proofOnFile}
                ref={fileInput}
                data-field="file"
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

          <Field label={t('reg.photo')} hint={t('reg.photoHint')}>
            {props => (
              <input
                {...props}
                type="file"
                className="file-input"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => setPhoto(e.target.files?.[0] ?? null)}
              />
            )}
          </Field>

          {/* A dropdown, not twenty-one chips: the list is long, a student
              chooses one, and a native <select> is the most accessible control
              for exactly that — every screen reader announces it as "combo box,
              one of twenty-one", every phone opens its own picker, and the form
              is a screen shorter. One choice, because the profile stores one
              disability_type; somebody with more than one chooses "Multiple
              disabilities, including deafblindness", the schedule's own item. */}
          <Field label={t('reg.disabilityType')} error={problems.disability || undefined} required>
            {props => (
              <select
                {...props}
                data-field="disability"
                value={disabilities[0] ?? ''}
                onChange={e => {
                  setDisabilities(e.target.value ? [e.target.value] : [])
                  clearProblem('disability')
                }}
              >
                <option value="">{t('common.chooseOne')}</option>
                {disabilityChips(t).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </Field>

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
                data-field="percent"
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

          <h3 className="register-section">{t('reg.education')}</h3>

          <Field label={t('reg.state')} error={problems.state || undefined} required>
            {props => (
              <div data-field="state">
              <SearchableSelect
                {...props}
                options={stateChoices(t)}
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
              </div>
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
              <div data-field="district">
              <DistrictPicker
                id={props.id}
                stateCode={state}
                value={district}
                onChange={v => { setDistrict(v); clearProblem('district') }}
                describedBy={props['aria-describedby']}
                invalid={!!problems.district}
              />
              </div>
            )}
          </Field>

          {/* The program as one dropdown with its groups as <optgroup>s —
              "Graduation" and "Post-Graduation / Masters" are headings the
              picker draws and cannot be chosen, which is what they are. The
              values are the ones the chips stored, so a saved answer reopens
              on itself. */}
          <Field label={t('reg.program')} error={problems.program || undefined} required>
            {props => (
              <select
                {...props}
                data-field="program"
                value={program}
                onChange={e => { setProgram(e.target.value); setYear(''); setPassYear(''); clearProblem('program') }}
              >
                <option value="">{t('common.chooseOne')}</option>
                {asChoices(PROGRAMS_TOP).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                <optgroup label={t('reg.graduation')}>
                  {asChoices(PROGRAMS_GRADUATION).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
                <optgroup label={t('reg.postgraduation')}>
                  {PROGRAMS_PG.map(p => <option key={p} value={`PG: ${p}`}>{p}</option>)}
                </optgroup>
                <option value={PROGRAM_PHD}>{PROGRAM_PHD}</option>
              </select>
            )}
          </Field>

          {isOther && (
            <Field
              label={t('reg.programOther')}
              hint={t('reg.programOtherHint')}
              error={problems.programOther || undefined}
              required
            >
              {props => (
                <input
                  {...props}
                  type="text"
                  data-field="programOther"
                  maxLength={160}
                  autoComplete="off"
                  value={programOther}
                  onChange={e => { setProgramOther(e.target.value); clearProblem('programOther') }}
                />
              )}
            </Field>
          )}

          {/* PhD has no year to give, so the question goes. The years that do
              not belong to the chosen program are disabled rather than removed
              — see ALL_YEARS — and "Completed / passed out" is the answer for
              a student who has finished or is between courses, which the list
              had none of. */}
          {category !== 'phd' && (
            <Field
              label={t('reg.year')}
              hint={!program ? t('reg.yearAfterProgram') : undefined}
              error={problems.year || undefined}
              required
            >
              {props => (
                <select
                  {...props}
                  data-field="year"
                  value={year}
                  disabled={!program}
                  onChange={e => { setYear(e.target.value); clearProblem('year') }}
                >
                  <option value="">{t('common.chooseOne')}</option>
                  {ALL_YEARS.map(y => (
                    <option key={y.label} value={y.label} disabled={yearsOff.includes(y.label)}>
                      {t(y.key)}
                    </option>
                  ))}
                  <option value={YEAR_DONE}>{t('reg.yearDone')}</option>
                </select>
              )}
            </Field>
          )}

          {year === YEAR_DONE && (
            <Field label={t('reg.passYear')} error={problems.passYear || undefined} required>
              {props => (
                <select
                  {...props}
                  className="input-short"
                  data-field="passYear"
                  value={passYear}
                  onChange={e => { setPassYear(e.target.value); clearProblem('passYear') }}
                >
                  <option value="">{t('common.chooseOne')}</option>
                  {PASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </Field>
          )}

          {/* Last exam marks — a percentage, or a CGPA on a ten- or five-point
              scale, since marksheets say it all three ways and making somebody
              convert their own grade is where the wrong number comes from.
              Optional: a student below Class 9 may have none to give, and a
              scheme with a marks minimum already reads a missing answer as
              "one step away" rather than refusing the student. */}
          <div className="field register-marks">
            <span className="field-label" id="reg-marks">
              {t('q.academic_percentage')}
              <span className="muted"> ({t('common.optional')})</span>
            </span>
            <span className="hint">{t('q.academic_percentage.help')}</span>
            <ChipSelector
              legend={t('q.academic_percentage')}
              name="marks-scale"
              options={SCALES.map(sc => ({ value: sc.value, label: sc.label }))}
              selected={[marksScale]}
              /* A single choice that is never empty: pressing the chosen chip
                 again reports no selection, and a scale is always in force. */
              onChange={v => { if (v[0]) { setMarksScale(v[0] as ScaleId); clearProblem('marks') } }}
            />
          </div>

          <Field
            label={scaleOf(marksScale).field}
            hint={scaleOf(marksScale).hint}
            error={problems.marks || undefined}
            optional={false}
          >
            {props => (
              <input
                {...props}
                type="number"
                // decimal, unlike the disability percentage: 76.5% and a CGPA
                // of 8.2 are both ordinary answers here.
                inputMode="decimal"
                data-field="marks"
                className="input-short"
                step={0.01}
                min={0}
                max={scaleOf(marksScale).max}
                placeholder={marksScale === 'PERCENT' ? '00.0' : '0.0'}
                value={marks}
                onChange={e => { setMarks(e.target.value); clearProblem('marks') }}
              />
            )}
          </Field>

          {/* What a CGPA becomes, said as it is typed: the number that will be
              saved and compared against every scheme's minimum. Polite, so it
              is read once the typing pauses rather than on every digit. */}
          {marksScale !== 'PERCENT' && marks.trim() !== '' && !marksProblem(scaleOf(marksScale), marks.trim()) && (
            <p className="wizard-derived register-derived" aria-live="polite">
              <span className="mark" aria-hidden="true">=</span>
              {/* A number and a percent sign, which read the same in every
                  language this site speaks — no sentence to translate. */}
              <span>{toPercent(Number(marks), scaleOf(marksScale))}%</span>
            </p>
          )}

          <Field label={t('reg.institution')} error={problems.institution || undefined} required>
            {props => (
              <input
                {...props}
                type="text"
                data-field="institution"
                placeholder={t('reg.institutionPlaceholder')}
                value={institution}
                onChange={e => { setInstitution(e.target.value); clearProblem('institution') }}
              />
            )}
          </Field>

          <div className="register-actions">
            <button type="button" onClick={() => goTo(1)}>{t('reg.back')}</button>
            <button type="submit" className="primary">{t('reg.toReview')}</button>
          </div>
          </section>

          <section hidden={step !== 3} aria-labelledby="reg-step-3">
          {stepHead(3)}
          <p className="register-sub">{t('reg.reviewLead')}</p>

          {/* What will be sent, as the student will be judged on it. A
              description list, so each answer is read with its question. */}
          <div className="review-block">
            <h3>{t('reg.step1')}</h3>
            <dl>
              {row(t('reg.name'), name.trim())}
              {row(t('auth.phone'), pendingCode ? formatE164(pendingCode.phone) : verified ? t('reg.verified') : '')}
              {row(t('reg.gender'), gender && choiceLabel(genderChoices(t), gender))}
              {row(t('reg.email'), email.trim())}
              {row(t('q.annual_family_income'), income !== '' ? money(Number(income)) : '')}
            </dl>
            <button type="button" onClick={() => goTo(1)}>{t('reg.editStep', { step: t('reg.step1') })}</button>
          </div>

          <div className="review-block">
            <h3>{t('reg.step2')}</h3>
            <dl>
              {row(t('reg.certShort'), t(certKind === 'UDID' ? 'reg.certUdid' : 'reg.certMedical'))}
              {certKind === 'UDID' && row(t('reg.udid'), udid.trim())}
              {row(t('reg.certFile'), file?.name ?? (profile ? t('reg.fileKept') : ''))}
              {row(t('reg.photo'), photo?.name)}
              {row(t('reg.disabilityType'), disabilities[0] && choiceLabel(disabilityChips(t), disabilities[0]))}
              {row(t('reg.percent'), percent !== '' ? `${percent}%` : '')}
              {row(t('reg.state'), state && choiceLabel(stateChoices(t), state))}
              {row(t('reg.district'), district)}
              {row(t('reg.program'), isOther ? programOther.trim() : program.replace(/^PG: /, ''))}
              {category !== 'phd' && row(t('reg.year'), yearText)}
              {row(t('q.academic_percentage'), marksText)}
              {row(t('reg.institution'), institution.trim())}
            </dl>
            <button type="button" onClick={() => goTo(2)}>{t('reg.editStep', { step: t('reg.step2') })}</button>
          </div>

          {/* A real checkbox in a fieldset, so the legend is read with it and
              the whole sentence is its label — the box and the words are one
              48px target. */}
          <fieldset className="register-declaration" data-field="declaration">
            <legend>
              {t('reg.declarationLegend')}
              <span className="req" aria-hidden="true"> *</span>
              <span className="sr-only"> ({t('common.required')})</span>
            </legend>
            <label className="declaration-choice">
              <input
                type="checkbox"
                checked={declared}
                aria-invalid={problems.declaration ? true : undefined}
                aria-describedby={problems.declaration ? 'reg-declaration-error' : undefined}
                onChange={e => { setDeclared(e.target.checked); clearProblem('declaration') }}
              />
              <span>{t('reg.declaration')}</span>
            </label>
            {problems.declaration && (
              <span className="error" id="reg-declaration-error" role="alert">{problems.declaration}</span>
            )}
          </fieldset>

          {/* Held by its own save only. Left pressable otherwise: a button
              that cannot be pressed and does not say why is where forms get
              abandoned, and submit() refuses in words. */}
          <button type="submit" className="primary wide register-cta" disabled={working === 'save'} aria-busy={working === 'save' || undefined}>
            {working === 'save' ? t('reg.saving') : profile ? t('reg.saveChanges') : t('reg.cta')}
          </button>

          <div className="register-actions">
            <button type="button" onClick={() => goTo(2)} disabled={working === 'save'}>{t('reg.back')}</button>
          </div>
          </section>
        </form>

        {!verified && (
          <p className="register-alt">
            {t('reg.already')} <Link to="/signin">{t('reg.login')}</Link>
          </p>
        )}
      </div>
      </div>
    </div>
  )
}
