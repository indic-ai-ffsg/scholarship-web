/* Authentication for the student portal.
 *
 * Three differences from the admin panel, all deliberate.
 *
 * There is no password. A student signs in with their mobile number and a code
 * Firebase sends to it; the same number and the same code register an account
 * that does not exist yet. One door, two outcomes — which is why there is no
 * separate registration call in here to go looking for.
 *
 * There is no second factor. Table 3.3 makes MFA mandatory for organisation and
 * platform roles; extending it to students would be a lockout risk on shared
 * family devices for exactly the people this platform exists to reach, and a
 * student's account holds their own data rather than a tenant's applicant pool.
 * A code to the handset is already the only factor, so a second one would be
 * the same factor twice.
 *
 * Nothing here decides whether a sign-in is legitimate. The code exchange
 * happens between the browser and Google; this file carries the resulting token
 * to /auth/phone, which verifies Google's signature and answers with a session.
 * Tampering with anything in this file changes what is asked for, never what is
 * granted.
 */

import {
  useCallback, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'

import * as api from './api'
import { AuthContext, type AuthApi, type AuthState } from './auth-context'
import * as firebase from './firebase'
import type { Envelope, LoginResult, Profile } from './types'

/** /auth/phone answers with a LoginResult plus which branch it took. */
type PhoneSignInResult = LoginResult & { created: boolean }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    context: null,
    profile: null,
    pendingCode: null,
    justRegistered: false,
    error: null,
  })

  /** The Firebase handle for the code in flight, held between the two steps. */
  const pending = useRef<firebase.PendingCode | null>(null)
  /** The number the code went to, so a resend does not ask for it again. */
  const pendingPhone = useRef<string | null>(null)

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const res = await api.get<Profile>('/me/profile')
      return res.data
    } catch {
      // A registered student with no profile yet is the normal first-run state,
      // not a failure. The app routes them into the wizard.
      return null
    }
  }, [])

  const applySession = useCallback(async (
    result: LoginResult, justRegistered = false,
  ) => {
    api.setAccessToken(result.token.access_token)

    // The platform's session exists now, so the Firebase one has done its job.
    // Left behind, it is a second signed-in identity on what is very often a
    // shared family handset.
    await firebase.forgetFirebaseSession()
    pending.current = null
    pendingPhone.current = null

    const profile = await loadProfile()
    setState({
      status: 'authenticated',
      context: result.active_context,
      profile,
      pendingCode: null,
      justRegistered,
      error: null,
    })
  }, [loadProfile])

  // A reload carries no token but the HttpOnly refresh cookie survives, so the
  // session is re-established rather than the student being asked to sign in
  // again for having pressed back.
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await api.request<Envelope<LoginResult>>('/auth/refresh', {
          method: 'POST', raw: true,
        })
        if (!cancelled) await applySession(res.data)
      } catch {
        if (!cancelled) setState(s => ({ ...s, status: 'anonymous' }))
      }
    })()

    return () => { cancelled = true }
  }, [applySession])

  useEffect(() => {
    api.setAuthLostHandler(() => {
      api.setAccessToken(null)
      setState({
        status: 'anonymous', context: null, profile: null,
        pendingCode: null, justRegistered: false, error: null,
      })
    })
    return () => api.setAuthLostHandler(null)
  }, [])

  const fail = useCallback((err: unknown, fallback: string) => {
    /* The screen gets a sentence a student can act on; the console gets what
     * actually happened.
     *
     * Firebase's phone-auth failures are nearly all reported as one of two
     * generic codes, and the reason they differ is carried in `serverResponse`
     * — CAPTCHA_CHECK_FAILED, RECAPTCHA_NOT_ENABLED, INVALID_APP_CREDENTIAL and
     * so on all arrive looking identical otherwise. Swallowing that turns every
     * sign-in problem into the same unactionable sentence. */
    const detail = err as { code?: string; customData?: { serverResponse?: unknown } }
    if (detail?.code || err instanceof Error) {
      console.error('[auth] sign-in failed', {
        code: detail?.code,
        message: err instanceof Error ? err.message : String(err),
        serverResponse: detail?.customData?.serverResponse,
        origin: window.location.origin,
      })
    }

    const message =
      err instanceof api.ApiError ? err.message
      : err instanceof Error && err.message ? firebaseMessage(err)
      : fallback
    setState(s => ({ ...s, error: message }))
    throw err
  }, [])

  const requestCode = useCallback(async (phone: string, containerId: string) => {
    const e164 = firebase.toE164(phone)
    if (!e164) {
      const message = 'Enter a 10-digit Indian mobile number.'
      setState(s => ({ ...s, error: message }))
      throw new Error(message)
    }

    setState(s => ({ ...s, error: null }))
    try {
      /* The fork, asked before the code is sent: is this number already
       * registered? Only a label for what the next screen says — the server
       * decides the branch again for itself when the token is exchanged, so
       * nothing depends on this answer still being true a minute later. */
      const known = await api.post<{ exists: boolean }>('/auth/phone/lookup', {
        phone: e164,
      })

      pending.current = await firebase.sendCode(e164, containerId)
      pendingPhone.current = e164
      setState(s => ({
        ...s,
        status: 'awaiting_code',
        pendingCode: { phone: e164, returning: known.data.exists },
      }))
    } catch (err) {
      // sendCode tears the widget down on its own way out, so there is nothing
      // to clean up here.
      fail(err, 'We could not send a code just now. Please try again.')
    }
  }, [fail])

  const submitCode = useCallback(async (code: string) => {
    if (!pending.current) return

    setState(s => ({ ...s, error: null }))
    try {
      const idToken = await firebase.confirmCode(pending.current, code)
      const res = await api.post<PhoneSignInResult>('/auth/phone', {
        id_token: idToken,
      })
      await applySession(res.data, res.data.created)
    } catch (err) {
      fail(err, 'We could not check that code. Please try again.')
    }
  }, [applySession, fail])

  const resendCode = useCallback(async (containerId: string) => {
    const phone = pendingPhone.current
    if (!phone) return

    setState(s => ({ ...s, error: null }))
    try {
      // sendCode builds a fresh widget every time, which is exactly what a
      // resend needs: the previous request's token is spent.
      pending.current = await firebase.sendCode(phone, containerId)
    } catch (err) {
      fail(err, 'We could not send another code just now.')
    }
  }, [fail])

  const cancelCode = useCallback(() => {
    pending.current = null
    pendingPhone.current = null
    firebase.resetRecaptcha()
    setState(s => ({ ...s, status: 'anonymous', pendingCode: null, error: null }))
  }, [])

  const signOut = useCallback(async () => {
    await api.logout()
    api.setAccessToken(null)
    await firebase.forgetFirebaseSession()
    pending.current = null
    pendingPhone.current = null
    setState({
      status: 'anonymous', context: null, profile: null,
      pendingCode: null, justRegistered: false, error: null,
    })
  }, [])

  /* Re-reads the profile, and the session with it.
   *
   * The session part is not optional. A student who has just registered holds a
   * token minted before their profile existed, so it carries no profile id —
   * and every student route is guarded on exactly that claim. Without a refresh
   * here, creating a profile succeeds and then the next request is refused with
   * "create your profile first", which is both wrong and maddening.
   *
   * /auth/refresh re-resolves the account's contexts server-side, so the new
   * token carries the profile the previous one could not have known about.
   */
  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.request<Envelope<LoginResult>>('/auth/refresh', {
        method: 'POST', raw: true,
      })
      api.setAccessToken(res.data.token.access_token)

      const profile = await loadProfile()
      setState(s => ({
        ...s, context: res.data.active_context, profile, justRegistered: false,
      }))
      return
    } catch {
      // The refresh cookie may be missing on a native client; fall back to
      // re-reading the profile with the token in hand, which is still correct
      // for every case except the one immediately after creation.
    }

    const profile = await loadProfile()
    setState(s => ({ ...s, profile, justRegistered: false }))
  }, [loadProfile])

  const clearError = useCallback(() => setState(s => ({ ...s, error: null })), [])

  const value = useMemo<AuthApi>(() => ({
    ...state, requestCode, submitCode, resendCode, cancelCode, signOut,
    refreshProfile, clearError,
  }), [state, requestCode, submitCode, resendCode, cancelCode, signOut,
       refreshProfile, clearError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* Firebase error codes, in words a student can act on.
 *
 * The raw messages are written for the developer holding the console —
 * "auth/too-many-requests" tells somebody trying to sign in nothing about what
 * to do next, and the untranslated fallbacks name Firebase, which is not a
 * product this audience has heard of.
 */
function firebaseMessage(err: Error): string {
  const code = (err as Error & { code?: string }).code ?? ''

  switch (code) {
    case 'auth/invalid-verification-code':
      return 'That code is not correct. Check the message and try again.'
    case 'auth/code-expired':
      return 'That code has expired. Ask for a new one.'
    case 'auth/invalid-phone-number':
      return 'That mobile number is not one we can send a code to.'
    case 'auth/too-many-requests':
      return 'Too many attempts from this device. Please wait a few minutes and try again.'
    case 'auth/quota-exceeded':
      return 'We cannot send codes at the moment. Please try again later.'
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      // Almost always a spent or rejected reCAPTCHA rather than anything to do
      // with the app's credentials, whatever the code name suggests. Asking for
      // a fresh code rebuilds the widget, which is the actual remedy.
      return 'That attempt could not be verified. Please ask for a new code.'
    case 'auth/network-request-failed':
      return 'We could not reach the network. Check your connection and try again.'
    default:
      return err.message || 'Something went wrong. Please try again.'
  }
}
