/* Authentication for the student portal.
 *
 * Three differences from the admin panel, all deliberate.
 *
 * There is no password. A student signs in with their mobile number and a code
 * MSG91 sends to it; the same number and the same code register an account
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
import { clearAllDrafts } from './draft'
import * as otp from './otp'
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

  /** Whether a code exchange is in flight, held between the two steps. */
  const pending = useRef<otp.PendingCode | null>(null)
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

    // The platform's session exists now, so the provider's has done its job.
    // Left behind, it would be a second signed-in identity on what is very often
    // a shared family handset. MSG91 holds nothing between calls, so this is a
    // no-op today — kept because the guarantee belongs to this file rather than
    // to whichever provider is behind it.
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
        // Through the shared refresh, never directly: StrictMode mounts this
        // effect twice, and two refreshes with one cookie is a replay to the
        // server, which revokes the whole family. See api.refreshSession.
        const res = await api.refreshSession<Envelope<LoginResult>>()
        if (!res) throw new Error('no session')
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
     * This once had to dig a Firebase failure out of `customData.serverResponse`,
     * because the SDK reported almost everything as one of two generic codes.
     * Nothing here talks to a provider any more — the only errors that reach
     * this function are our API's, which already carry a sentence written for a
     * student, or a network failure, which carries none.
     */
    console.error('[auth] sign-in failed', {
      message: err instanceof Error ? err.message : String(err),
      status: err instanceof api.ApiError ? err.status : undefined,
    })

    /* Three kinds of failure, and they must not be told apart wrongly.
     *
     * An ApiError carries the server's own words, written for the person
     * reading them — "That code was not accepted. Check it, or ask for a new
     * one." Passing them through keeps the wording in one place.
     *
     * A NotConfiguredError is OURS: the build has no widget id, so no code will
     * ever be sent however many times the student tries. Saying "try again"
     * there is a lie that costs somebody an afternoon, so it says outright that
     * the service is not set up. This exact case shipped once, reported as a
     * transient error, and nobody could tell from the screen.
     *
     * Anything else is a network fault and gets the caller's fallback. */
    const message =
      err instanceof api.ApiError ? err.message
      : err instanceof otp.NotConfiguredError
        ? 'Sign-in by mobile is not set up on this site yet. Please tell us if you see this.'
        : fallback
    setState(s => ({ ...s, error: message }))
    throw err
  }, [])

  const requestCode = useCallback(async (phone: string) => {
    const e164 = otp.toE164(phone)
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

      pending.current = await otp.sendCode(e164)
      pendingPhone.current = e164
      setState(s => ({
        ...s,
        status: 'awaiting_code',
        pendingCode: { phone: e164, returning: known.data.exists },
      }))
    } catch (err) {
      fail(err, 'We could not send a code just now. Please try again.')
    }
  }, [fail])

  const submitCode = useCallback(async (code: string) => {
    if (!pending.current) return

    setState(s => ({ ...s, error: null }))
    try {
      /* The widget checks the code and hands back a signed token; the API
       * exchanges that token for a session. This app never sees the code after
       * it is typed and could not verify one if it did. */
      const idToken = await otp.confirmCode(code)
      const res = await api.post<PhoneSignInResult>('/auth/phone', {
        id_token: idToken,
      })
      await applySession(res.data, res.data.created)
    } catch (err) {
      fail(err, 'We could not check that code. Please try again.')
    }
  }, [applySession, fail])

  const resendCode = useCallback(async () => {
    if (!pendingPhone.current) return

    setState(s => ({ ...s, error: null }))
    try {
      // The widget's own retry: it keeps the exchange open and repeats the code
      // on it, rather than starting a new one.
      await otp.resendCode()
    } catch (err) {
      fail(err, 'We could not send another code just now.')
    }
  }, [fail])

  const cancelCode = useCallback(() => {
    pending.current = null
    pendingPhone.current = null
    setState(s => ({ ...s, status: 'anonymous', pendingCode: null, error: null }))
  }, [])

  const signOut = useCallback(async () => {
    await api.logout()
    api.setAccessToken(null)

    /* The drafts go with the session.
     *
     * clearAllDrafts has said "on sign-out" in its own doc comment since it was
     * written and was never called from here, so signing out left the wizard's
     * saved answers in localStorage: disability type, disability percentage,
     * family income, UDID number. This app already treats the handset as shared
     * — it is why the provider session is torn down two lines above — and a
     * half-finished profile is the most sensitive thing it holds.
     *
     * Both keys, because the wizard writes under the profile id once there is
     * one and under 'new' before that, and somebody who signs out mid-way
     * through their first attempt is exactly the case worth clearing. */
    const owner = state.context?.profile_id
    if (owner) clearAllDrafts(owner)
    clearAllDrafts('new')

    pending.current = null
    pendingPhone.current = null
    setState({
      status: 'anonymous', context: null, profile: null,
      pendingCode: null, justRegistered: false, error: null,
    })
  }, [state.context?.profile_id])

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
      // Shared, for the same reason: this runs right after a profile save, and
      // landing beside the bootstrap's refresh would end the session.
      // refreshSession sets the access token itself.
      const res = await api.refreshSession<Envelope<LoginResult>>()
      if (!res) throw new Error('no session')

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

