/* Firebase phone authentication — the student portal's only front door.
 *
 * The division of labour is worth stating, because it is not the usual one.
 * Firebase issues the code, sends the SMS and checks the digits; all of that
 * happens between this browser and Google, and the API never sees a code. What
 * the API receives is the ID token Firebase hands back — a signed assertion
 * that whoever is at this keyboard controls a particular number — and its job is
 * only to decide what that entitles them to.
 *
 * So nothing here is a security boundary. A determined caller can drive this
 * file however they like; what stops them is that they cannot forge Google's
 * signature on the token the API insists on.
 *
 * The config below is public by design. A Firebase web apiKey identifies the
 * project, it does not authorise anything: what actually gates phone auth is
 * the project's authorised-domain list and reCAPTCHA, both enforced by Google.
 * Keeping these in the bundle is the documented arrangement, not a leak.
 */

/* Types only, and that is load-bearing rather than tidiness.
 *
 * `import type` is erased at build time, so nothing here puts the Firebase SDK
 * into the bundle. The SDK itself arrives through the dynamic imports in
 * client() and sendCode() below, which Vite emits as its own chunk.
 *
 * It is ~120 KB of JavaScript that exists to send one SMS. Imported statically
 * it sat in the main chunk, which meant every visitor to the landing page — who
 * is not signing in, and most of whom never will — downloaded a phone-auth SDK
 * before the page could paint. Now it is fetched by the press of "Send code",
 * which is the first moment anybody needs it. */
import type { FirebaseApp } from 'firebase/app'
import type { RecaptchaVerifier, Auth, ConfirmationResult } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

/* Initialised lazily rather than at module load, so that a missing or wrong
 * config surfaces when somebody tries to sign in — with a message naming the
 * problem — instead of throwing during the import graph and rendering a blank
 * page with a stack trace in the console. */
async function client(): Promise<Auth> {
  if (!config.apiKey || !config.projectId) {
    throw new Error(
      'Sign-in is not configured for this deployment. ' +
      'VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID must be set at build time.',
    )
  }
  if (!auth) {
    const [{ initializeApp }, { getAuth }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ])
    app = initializeApp(config)
    auth = getAuth(app)
    // Codes and error messages follow the device, not the project's default.
    auth.useDeviceLanguage()
  }
  return auth
}

let verifier: RecaptchaVerifier | null = null

/* reCAPTCHA is not optional and cannot be skipped: Firebase refuses to send an
 * SMS without one, because otherwise the endpoint is a free SMS cannon pointed
 * at any number somebody cares to type. Invisible mode resolves silently for an
 * ordinary visitor and challenges only when Google is unconvinced.
 *
 * A verifier is good for exactly ONE code request. Its token is consumed by the
 * verify() that signInWithPhoneNumber performs internally, and presenting a
 * consumed token is what produces auth/invalid-app-credential — an error whose
 * wording points at the app's credentials and not, as is actually the case, at
 * a captcha that has already been spent.
 *
 * So a fresh one is built per request and the previous one is always torn down
 * first. Vite's hot reload makes the alternative worse than it looks: a cached
 * verifier survives a module reload, so a stale token outlives the edit that
 * was supposed to clear it and the very first press of the button fails. */
export function resetRecaptcha() {
  if (verifier) {
    try { verifier.clear() } catch { /* already gone */ }
    verifier = null
  }
  // clear() detaches the widget, but a container left holding its markup makes
  // the next render into it unreliable. Emptying it is cheap and removes a
  // class of "works once, then never again" failures.
  if (containerInUse) {
    const el = document.getElementById(containerInUse)
    if (el) el.innerHTML = ''
    containerInUse = null
  }
}

let containerInUse: string | null = null

/** What a code request returns: the handle needed to check the digits. */
export type PendingCode = ConfirmationResult

/* Asks Firebase to send a code, and returns the handle that verifies it.
 *
 * The number must already be in E.164 (+919876543210). Normalising it is the
 * caller's job because the caller is the one that knows what the student typed
 * and can explain what is wrong with it. */
export async function sendCode(
  e164: string,
  recaptchaContainerId: string,
): Promise<PendingCode> {
  resetRecaptcha()

  const auth = await client()
  // Already resolved and cached by client() above; this is a map lookup, not a
  // second download.
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth')
  verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' })
  containerInUse = recaptchaContainerId

  try {
    return await signInWithPhoneNumber(auth, e164, verifier)
  } catch (err) {
    // Never leave a spent widget behind for the retry to trip over.
    resetRecaptcha()
    throw err
  }
}

/* Checks the digits and returns the ID token for the API.
 *
 * getIdToken is called on the freshly signed-in user rather than reusing
 * anything cached: this token is about to be exchanged for a session, and it
 * should be the one minted by the code that was just entered. */
export async function confirmCode(pending: PendingCode, code: string): Promise<string> {
  const credential = await pending.confirm(code)
  return credential.user.getIdToken()
}

/* Ends the Firebase session once the API has issued its own.
 *
 * The two are unrelated after the exchange: the platform's session is the
 * refresh cookie and the access token, and leaving a second signed-in identity
 * in IndexedDB serves nothing except to confuse the next sign-in on a shared
 * family device — which, for this user base, is the common case rather than
 * the exception. */
export async function forgetFirebaseSession() {
  try { await (await client()).signOut() } catch { /* nothing signed in */ }
  resetRecaptcha()
}

/* Turns what a person types into E.164, or returns null.
 *
 * Indian mobile numbers are ten digits beginning 6-9. Accepted here: bare ten
 * digits, a 0 or 91 or +91 prefix, and any arrangement of spaces or dashes in
 * between, because all of those are how the number appears on the documents
 * this audience is copying from.
 */
export function toE164(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '')

  const ten =
    digits.length === 10 ? digits
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : null

  if (!ten || !/^[6-9]\d{9}$/.test(ten)) return null
  return `+91${ten}`
}

/* The number as it should be shown back to the student: +91 98765 43210.
 * Grouped the way it is printed on a phone bill, so it can be checked at a
 * glance against the handset they are holding. */
export function formatE164(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164)
  return m ? `+91 ${m[1]} ${m[2]}` : e164
}
