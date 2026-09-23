import { Link } from 'react-router-dom'

import { useI18n } from '../lib/i18n-context'

/* The page for an address nothing answers.
 *
 * Its own module because two places reach it: the router's last route, and the
 * admin-written page route in front of it, which matches every path and only
 * learns from the API's 404 that there is no such page. That second path used
 * to show the generic error box — "Something went wrong", a request id and a
 * Try again button — for a mistyped address, which tells a student the site
 * broke and invites them to repeat something that cannot succeed.
 *
 * It was a bare "404" before that. A number is a status code, not a sentence,
 * and it is read out as "four hundred and four". The heading says what
 * happened and the two links say where to go; the directory is first because
 * a student who followed a stale link was almost always looking for a scheme.
 *
 * Router links, not anchors: an <a href> reloaded the whole bundle to move one
 * page. */
export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="page narrow not-found">
      <h1>{t('notFound.title')}</h1>
      <p className="muted">{t('notFound.body')}</p>
      <p className="row">
        <Link className="btn primary" to="/scholarships">{t('public.back')}</Link>
        <Link className="btn" to="/">{t('notFound.home')}</Link>
      </p>
    </div>
  )
}
