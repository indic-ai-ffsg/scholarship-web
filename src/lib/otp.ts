/* Mobile sign-in, through MSG91's OTP widget.
 *
 * The widget sends the code and checks it, in the browser, and hands back a
 * signed access token. Our API exchanges that token for a session.
 *
 * ---------------------------------------------------------------------------
 * Why the widget and not our own API calls
 * ---------------------------------------------------------------------------
 *
 * Because of India's DLT regime, and this was learned the expensive way.
 *
 * MSG91's `POST /api/v5/otp` looks like the cleaner design — the exchange runs
 * server-side, nothing about the provider reaches the browser, and there is no
 * build-time configuration to forget. It was built that way and it could not
 * deliver a single message. Sending under your own account needs a template
 * registered on the DLT portal AND the sender header registered with it; a
 * template showing "Approved" in MSG91 means only that MSG91 accepted the draft.
 * Until DLT approves the header, the operator drops every message — while MSG91
 * answers `HTTP 200 {"type":"success"}` and issues a request id, so nothing
 * anywhere reports a failure.
 *
 * The widget sends under MSG91's own registered header. That is the whole reason
 * it exists and the reason this platform uses it: the DLT relationship is
 * theirs, not ours.
 *
 * ---------------------------------------------------------------------------
 * The cost, and what is done about it
 * ---------------------------------------------------------------------------
 *
 * The widget needs configuration compiled into this bundle, and a deployment
 * that lacks it has a sign-in page that takes a mobile number and then does
 * nothing. That shipped once: the values were unset, `sendCode` threw before
 * sending anything, and the student saw a generic "try again later".
 *
 * So `configured()` is checked before the flow starts and the failure is
 * explicit and loud — in the console for whoever is deploying, and on screen as
 * a sentence that says the deployment is misconfigured rather than pretending
 * the network is at fault. A missing build value must never look like a
 * transient error.
 */

import { setting } from './runtime-config'

/** The widget's callback shape. `message` carries the access token.
 *
 * The error fields are not decoration. MSG91 answers a failed send on the
 * SUCCESS callback, carrying hasError/status/errors — see `settle` below. */
interface WidgetResult {
  type?: string
  message: string
  hasError?: boolean
  status?: string
  errors?: unknown
}

type Success = (data: WidgetResult) => void
type Failure = (err: WidgetResult) => void

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void
    /* Exposed by the widget when `exposeMethods` is set — and only after
       initSendOTP has run, which is why every use goes through load(). */
    sendOtp?: (identifier: string, success: Success, failure: Failure) => void
    verifyOtp?: (otp: string, success: Success, failure: Failure) => void
    retryOtp?: (channel: string | null, success: Success, failure: Failure) => void
  }
}

/* Read through runtime-config rather than import.meta.env, so the value can
 * come from the container's environment. A build argument could only be changed
 * by rebuilding the image, which is not where anyone deploying this knows the
 * answer. See src/lib/runtime-config.ts. */
const widgetId = () => setting('MSG91_WIDGET_ID')
/* MSG91's script takes a `tokenAuth` alongside the widget id. Treated as
 * optional because a widget can be configured without one, and a hard
 * requirement would refuse a deployment that works — but if the widget fails to
 * initialise, an absent tokenAuth is the first thing to check. */
const tokenAuth = () => setting('MSG91_TOKEN_AUTH')
const SCRIPT_SRC = 'https://verify.msg91.com/otp-provider.js'

/** Raised when the deployment has no widget configured. Distinct from every
 *  other failure, because it is ours and not the student's or the network's. */
export class NotConfiguredError extends Error {
  constructor() {
    super(
      'Phone sign-in is not configured for this deployment: '
      + 'MSG91_WIDGET_ID is not set on the container.',
    )
    this.name = 'NotConfiguredError'
  }
}

/** Whether sign-in can work at all. */
export function configured(): boolean {
  return Boolean(widgetId())
}

/* One load and one initialisation, however many times a student retries.
 *
 * Held as a promise rather than a boolean so two calls racing — a double-tap on
 * "Send code" — await the same load instead of injecting two script tags and
 * initialising the widget twice.
 */
let ready: Promise<void> | null = null

/* How long to wait for MSG91 to attach its methods, and how often to look.
 *
 * The timeout is generous because the alternative to waiting is an error, and
 * a student on a train is not misconfigured. The poll is short because the
 * usual answer arrives in about a fifth of a second and every one of these
 * intervals is a student watching a button do nothing. */
const READY_TIMEOUT_MS = 15_000
const READY_POLL_MS = 50

function load(): Promise<void> {
  if (ready) return ready

  ready = new Promise<void>((resolve, reject) => {
    if (!configured()) {
      // Loud, and named, so a deploy without the value is diagnosable from the
      // console rather than from a student's report.
      console.error(
        '[otp] MSG91_WIDGET_ID is not set, so phone sign-in cannot work. It is '
        + 'read at container start: set it on the service and restart. No '
        + 'rebuild is needed. Under `npm run dev` it comes from .env instead.',
      )
      reject(new NotConfiguredError())
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    )

    const start = () => {
      if (!window.initSendOTP) {
        ready = null
        reject(new Error('The verification widget did not load.'))
        return
      }
      const config: Record<string, unknown> = {
        widgetId: widgetId(),
        /* Gives us sendOtp/verifyOtp/retryOtp instead of the widget rendering
           its own dialog. The portal owns its sign-in screen — it is where a
           student who cannot see well meets this platform, and it is built to
           the same 48px targets and focus rules as everything else. A
           third-party modal answers to none of that. */
        exposeMethods: true,
        success: () => {},
        failure: () => {},
      }
      const auth = tokenAuth()
      if (auth) config.tokenAuth = auth

      window.initSendOTP(config)

      /* initSendOTP returns before the methods it promises exist.
       *
       * It fetches the widget's own configuration first — GET
       * control.msg91.com/api/v5/widget/getWidgetProcess — and attaches
       * sendOtp/verifyOtp/retryOtp only once that answers. Measured at 202ms
       * from this machine; a student on mobile data will wait longer.
       *
       * Resolving here handed sendCode an undefined window.sendOtp, so the
       * first press of "Send code" after every page load rejected with "the
       * verification widget is not ready" — which reached the student as the
       * generic "We could not send a code just now. Please try again."
       * Pressing it again worked, because by then the fetch had landed and
       * `ready` was already resolved. An error that clears itself on a retry
       * is exactly the kind that gets read as a flaky network and chased in
       * the wrong place; this one cost an evening.
       *
       * Polling rather than a fixed delay, because 200ms is one measurement on
       * one connection and any constant picked from it is either too short for
       * a student on a slow phone or a pause everyone else pays for. */
      const deadline = Date.now() + READY_TIMEOUT_MS
      const settleWhenExposed = () => {
        if (typeof window.sendOtp === 'function') {
          resolve()
          return
        }
        if (Date.now() >= deadline) {
          // Cleared so this is retryable rather than poisoning the session.
          ready = null
          reject(new Error('The verification widget did not become ready.'))
          return
        }
        setTimeout(settleWhenExposed, READY_POLL_MS)
      }
      settleWhenExposed()
    }

    if (existing && window.initSendOTP) {
      start()
      return
    }

    const script = existing ?? document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = start
    script.onerror = () => {
      // Cleared so a student who lost their connection for a moment can try
      // again rather than being stuck with a rejected promise for the session.
      ready = null
      reject(new Error('The verification service could not be reached.'))
    }
    if (!existing) document.head.appendChild(script)
  })

  return ready
}

/* Decides whether a widget callback is actually a success.
 *
 * MSG91 does not reserve the failure callback for failures. A send refused by
 * its own backend arrives on the SUCCESS callback carrying
 *
 *   {"errors":"Trying to access array offset on value of type null",
 *    "hasError":true,"status":"fail","duration":"39ms"}
 *
 * and no `message` at all. Taking that at face value resolved sendCode, moved
 * the student to "enter the code we sent you", and started a sixty-second
 * resend countdown for an SMS that was never sent — the worst shape a failure
 * can take here, because the screen asserts something happened and the student
 * waits for it, then blames the network or their own phone.
 *
 * So the envelope is inspected rather than trusted, and anything that says it
 * failed is rejected however it arrived. */
function settle(
  data: WidgetResult,
  resolve: (token: string) => void,
  reject: (err: Error) => void,
) {
  if (data?.hasError || data?.status === 'fail') {
    const detail = typeof data.errors === 'string' ? data.errors : data.message
    reject(new Error(
      detail
        ? `The verification service refused to send the code: ${detail}`
        : 'The verification service refused to send the code.',
    ))
    return
  }
  resolve(data.message)
}

/* The widget's methods are callback-based; everything else here is async.
 * `failure` hands back the same shape as success, so the message is carried
 * through as an Error for the caller to surface. */
function call(
  fn: ((a: string, s: Success, f: Failure) => void) | undefined,
  arg: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fn) {
      reject(new Error('The verification widget is not ready.'))
      return
    }
    fn(arg, data => settle(data, resolve, reject), err =>
      reject(new Error(err?.message || 'That could not be completed.')))
  })
}

/* Marks a code exchange in flight.
 *
 * MSG91 keeps the state inside the widget, so there is nothing to carry between
 * the two steps. The type stays so the caller's "are we mid-exchange" check
 * reads the same, and so the seam survives the next provider. */
export interface PendingCode {
  phone: string
}

/** Sends a code. The number must already be E.164. */
export async function sendCode(e164: string): Promise<PendingCode> {
  await load()
  // MSG91 wants the number without the plus: 919876543210.
  await call(window.sendOtp, e164.replace(/^\+/, ''))
  return { phone: e164 }
}

/* The channels a code can arrive on.
 *
 * MSG91's codes, not ours: SMS 11, VOICE 4, EMAIL 3, WHATSAPP 12. They have to
 * be configured as retry processes on the widget before any of them will send —
 * ours has SMS, WhatsApp and Voice, so EMAIL is left out of the union rather
 * than offered and refused. */
export const CHANNELS = {
  sms: '11',
  whatsapp: '12',
  voice: '4',
} as const

export type Channel = keyof typeof CHANNELS

/* Sends another code for the same number, optionally on a different channel.
 *
 * `channel` undefined repeats whichever was used, which is SMS.
 *
 * The choice belongs to the student and must never be made for them. A voice
 * call to a student who is deaf is worse than useless — it looks like the
 * platform tried and they failed — and WhatsApp is silently useless to anyone
 * on a feature phone. So this takes an argument instead of getting clever, and
 * the screen offers all three as equal options rather than escalating through
 * them: the person holding the phone is the only one who knows which of these
 * they can actually receive.
 *
 * The other direction matters too. When SMS does not arrive — and on Indian
 * networks under DLT it sometimes does not, for reasons no error reports —
 * WhatsApp is the difference between signing in and giving up. Without this
 * the only recourse was pressing "send it again" and hoping the same road
 * worked the second time. */
export async function resendCode(channel?: Channel): Promise<void> {
  await load()
  await new Promise<string>((resolve, reject) => {
    if (!window.retryOtp) {
      reject(new Error('The verification widget is not ready.'))
      return
    }
    window.retryOtp(
      channel ? CHANNELS[channel] : null,
      // Same envelope, same trap: a refused resend arrives here, not below.
      data => settle(data, resolve, reject),
      err => reject(new Error(err?.message || 'We could not send another code.')),
    )
  })
}

/** Confirms the digits and returns the access token for the API to verify. */
export async function confirmCode(code: string): Promise<string> {
  await load()
  return call(window.verifyOtp, code.trim())
}

/* --- number handling ---------------------------------------------------------
 *
 * Unchanged across three providers now: the shapes a student types have not
 * altered, and the server still stores E.164 with the plus. */

/** Turns what a student typed into +91XXXXXXXXXX, or null if it is not one. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  // 10 digits, or the same with a country code in front. An Indian mobile
  // starts 6–9; anything else is a landline or a typo.
  const local = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits

  if (local.length !== 10 || !/^[6-9]/.test(local)) return null
  return `+91${local}`
}

/** +919876543210 → +91 98765 43210, the grouping printed on a phone bill. */
export function formatE164(e164: string): string {
  const local = e164.replace(/^\+91/, '')
  if (local.length !== 10) return e164
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
}
