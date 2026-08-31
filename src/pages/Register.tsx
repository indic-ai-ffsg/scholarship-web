/* There is no separate registration any more.
 *
 * A mobile number and a code do both jobs: an unknown number is registered on
 * the way through, a known one is signed in. Keeping the route alive and
 * redirecting is the point of this file — /register is printed on outreach
 * material, sits in browser histories, and is linked from the public
 * eligibility check, and none of those should turn into a 404 because the flow
 * behind them was simplified.
 *
 * The destination carries over, so somebody who followed "create an account to
 * apply" still lands on the scholarship they were looking at.
 */

import { Navigate, useLocation } from 'react-router-dom'

import { withNext } from '../lib/next'

export default function Register() {
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next')

  return <Navigate to={withNext('/signin', next)} replace />
}
