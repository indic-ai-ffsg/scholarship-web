/* Mobile sign-in, through MSG91's OTP widget.
 *
 * Replaces a Firebase module at the same three-function seam — send, confirm,
 * resend — so lib/auth.tsx barely changed. What did change is worth knowing:
 *
 * There is no reCAPTCHA. Firebase required an invisible challenge rendered into
 * a real DOM node before it would send anything, which is why the old module
 * took a container id, why the sign-in page carried an empty div for it, and why
 * a resend had to tear the widget down and build another. MSG91 does its own
 * abuse control server-side. The container id is gone from this file and from
 * its callers.
 *
 * The script is loaded on demand rather than bundled. Firebase's SDK was ~120 KB
 * that existed to send one SMS, and dynamic loading is what kept it out of the
 * main chunk; the same reasoning applies to a remote script, and this one is
 * smaller. Nothing is fetched until a student actually asks for a code.
 *
 * ---------------------------------------------------------------------------
 * What is and is not a secret here
 * ---------------------------------------------------------------------------
 *
 * `widgetId` and `tokenAuth` ship in the browser bundle and are meant to. They
 * identify the widget and authorise it to send a code — nothing more.
 *
 * The MSG91 **authkey** is a different value entirely and must never appear in
 * this file, in any VITE_ variable, or in anything served to a browser: it
 * authorises sending SMS and email on the whole account, and it is what the API
 * uses server-side to verify the token this module returns. If it is ever pasted
 * into a client-side config it has to be rotated.
 */

/** The widget's own callback shape. `message` carries the access token. */
interface WidgetResult {
  type?: string
  message: string
}

type Success = (data: WidgetResult) => void
type Failure = (err: WidgetResult) => void

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void
    /* Exposed by the widget when `exposeMethods` is set. Present only after
       initSendOTP has run, which is why every use below goes through ready(). */
    sendOtp?: (identifier: string, success: Success, failure: Failure) => void
    verifyOtp?: (otp: string, success: Success, failure: Failure) => void
    retryOtp?: (channel: string | null, success: Success, failure: Failure) => void
  }
}

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH
const SCRIPT_SRC = 'https://verify.msg91.com/otp-provider.js'

/** Whether sign-in can work at all. */
export function configured(): boolean {
  return Boolean(WIDGET_ID && TOKEN_AUTH)
}

/* One load, one initialisation, however many times a student retries.
 *
 * Held as a promise rather than a boolean so that two calls racing — a fast
 * double-tap on "Send code" — await the same load instead of injecting two
 * script tags and initialising the widget twice.
 */
let ready: Promise<void> | null = null

function load(): Promise<void> {
  if (ready) return ready

  ready = new Promise<void>((resolve, reject) => {
    if (!configured()) {
      reject(new Error(
        'VITE_MSG91_WIDGET_ID and VITE_MSG91_TOKEN_AUTH must be set at build time.',
      ))
      return
    }

    // A tag left by a previous mount, or by a hot reload in development.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    )
    const script = existing ?? document.createElement('script')

    const start = () => {
      if (!window.initSendOTP) {
        reject(new Error('The verification widget did not load.'))
        return
      }
      window.initSendOTP({
        widgetId: WIDGET_ID,
        tokenAuth: TOKEN_AUTH,
        /* Gives us sendOtp/verifyOtp/retryOtp instead of the widget rendering
           its own dialog. The portal owns its sign-in screen — it is the one
           place a student who cannot see well meets this platform, and it is
           built to the same 48px targets and focus rules as everything else. A
           third-party modal would answer to none of that. */
        exposeMethods: true,
        success: () => {},
        failure: () => {},
      })
      resolve()
    }

    if (existing && window.initSendOTP) {
      start()
      return
    }

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

/* The widget's methods are callback-based; everything else here is async.
 *
 * `failure` hands back the same shape as success, so the message is carried
 * through as an Error for lib/auth.tsx to surface. */
function call(
  fn: ((a: string, s: Success, f: Failure) => void) | undefined,
  arg: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fn) {
      reject(new Error('The verification widget is not ready.'))
      return
    }
    fn(
      arg,
      data => resolve(data.message),
      err => reject(new Error(err?.message || 'That could not be completed.')),
    )
  })
}

/* PendingCode existed to carry Firebase's ConfirmationResult between the two
 * steps. MSG91 keeps that state inside the widget, so there is nothing to hold —
 * the type stays as a marker so auth.tsx's "are we mid-exchange" check reads the
 * same, and so the seam survives the next provider too. */
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

/** Sends another code for the same number. */
export async function resendCode(): Promise<void> {
  await load()
  await new Promise<string>((resolve, reject) => {
    if (!window.retryOtp) {
      reject(new Error('The verification widget is not ready.'))
      return
    }
    // null channel: MSG91 repeats whichever it used, which is SMS here. Naming
    // one would mean choosing voice or WhatsApp on the student's behalf.
    window.retryOtp(
      null,
      data => resolve(data.message),
      err => reject(new Error(err?.message || 'We could not send another code.')),
    )
  })
}

/** Confirms the digits and returns the access token for the API to verify. */
export async function confirmCode(code: string): Promise<string> {
  await load()
  return call(window.verifyOtp, code.trim())
}

/* Nothing is held between sessions — no provider session to sign out of, unlike
 * Firebase, which kept one in IndexedDB and had to be told to forget it.
 * Retained as a no-op so lib/auth.tsx's sign-out path does not need to know
 * which provider is behind this, and so a provider that DOES hold something has
 * a place to clear it. */
export async function forgetSession(): Promise<void> {}

/* --- number handling ---------------------------------------------------------
 *
 * Unchanged from the Firebase module: the shapes a student types have not
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
