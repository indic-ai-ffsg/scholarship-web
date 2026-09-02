import { createContext, useContext } from 'react'

import type { Context, Profile } from './types'

export interface AuthState {
  status: 'loading' | 'anonymous' | 'awaiting_code' | 'authenticated'
  context: Context | null
  /** The student's own profile, or null when they have not built one yet. */
  profile: Profile | null
  /**
   * Set between asking for a code and entering it.
   *
   * `returning` is the answer to the "does this number exist?" check the flow
   * runs before sending the code, so the code screen can say which of login and
   * registration is about to happen. It is a label, not a decision: the server
   * re-resolves the branch for itself when the token is exchanged, so a number
   * registered in the seconds in between still lands correctly.
   */
  pendingCode: { phone: string; returning: boolean } | null
  /**
   * True when the sign-in that just completed created the account rather than
   * finding one. The app routes on it: a new student goes to the details
   * wizard, a returning one to their dashboard.
   *
   * There is no separate registration step to observe any more — one number and
   * one code cover both branches of the flow — so this is the only signal that
   * distinguishes them.
   */
  justRegistered: boolean
  error: string | null
}

export interface AuthApi extends AuthState {
  /**
   * Asks the provider to send a code to the number.
   *
   * Took a second argument under the previous provider: the id of a DOM node for
   * an invisible reCAPTCHA, which it would not send an SMS without. MSG91 does
   * its abuse control server-side, so there is no widget to bind and no element
   * for the page to carry.
   *
   * Rejects with a message fit to show when the number is malformed or when the
   * provider refuses — too many requests, most often.
   */
  requestCode(phone: string): Promise<void>
  /** Checks the code and exchanges the resulting token for a session. */
  submitCode(code: string): Promise<void>
  /** Sends another code to the same number. */
  resendCode(): Promise<void>
  /** Abandons the code step and returns to the number entry. */
  cancelCode(): void
  signOut(): Promise<void>
  /** Re-reads the profile after the wizard or a document changes it. */
  refreshProfile(): Promise<void>
  clearError(): void
}

export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
