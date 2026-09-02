/* Mobile sign-in.
 *
 * Two calls to our own API and nothing else. There is no provider SDK here, no
 * remote script, and no build-time configuration — which is the whole point of
 * the shape.
 *
 * It was a browser widget until recently: MSG91's script sent and verified the
 * code, and the API only exchanged the resulting token for a number. That put
 * the entire flow behind two VITE_ values compiled into the bundle, and a
 * deployment without them had a sign-in page that took a mobile number, called
 * the lookup endpoint, and then silently did nothing — no code, no second step,
 * no way for the student to tell what had gone wrong. It shipped exactly that
 * way. A provider the browser has to reach directly is a provider that can be
 * missing from the browser's configuration; the server always has its own.
 *
 * What remains here is number handling and two thin wrappers, kept as a module
 * so the sign-in screen imports the flow rather than assembling URLs.
 */

import * as api from './api'

/** What the API says after a code has been sent. */
export interface SendResult {
  /** The number already has an account, so the next screen says "welcome back". */
  returning: boolean
  /** Seconds before another code may be asked for, as the SERVER counts it. */
  retryAfterSeconds: number
}

/* Asks for a code.
 *
 * Also answers whether the number is registered, which used to be a second
 * request to /auth/phone/lookup. Folded in because the two questions are asked
 * at the same instant and the student is already waiting on an SMS; two round
 * trips to draw one screen is a second of nothing happening on a connection
 * that may be slow.
 */
export async function sendCode(e164: string): Promise<SendResult> {
  const res = await api.post<{
    returning: boolean
    retry_after_seconds: number
  }>('/auth/phone/send', { phone: e164 })

  return {
    returning: res.data.returning,
    retryAfterSeconds: res.data.retry_after_seconds,
  }
}

/* Asks for the same code again.
 *
 * The same endpoint: the server's cooldown decides whether this is a resend or
 * a refusal, and it answers 429 with a sentence when it is too soon. A separate
 * "retry" call would be a second place for that rule to live and disagree.
 */
export async function resendCode(e164: string): Promise<SendResult> {
  return sendCode(e164)
}

/* --- number handling ---------------------------------------------------------
 *
 * Unchanged across two providers now: the shapes a student types have not
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
