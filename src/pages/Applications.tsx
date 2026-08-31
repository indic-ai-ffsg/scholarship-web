import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useQuery } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import { shortDate } from '../lib/format'
import { Empty, ErrorState, Loading } from '../components/ui'
import type { Application } from '../lib/types'

export default function Applications() {
  const { t } = useI18n()

  const query = useQuery<Application[]>(
    signal => api.get('/me/applications', { page_size: 50 }, signal),
    [],
  )

  const apps = query.data ?? []

  return (
    <div className="page">
      <h1>{t('appl.title')}</h1>

      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && apps.length === 0 && (
        <Empty
          title={t('appl.none')}
          hint={t('appl.noneHint')}
          action={<Link className="btn primary" to="/matches">{t('nav.matches')}</Link>}
        />
      )}

      {apps.length > 0 && (
        <ul role="list" className="stack" style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
          {apps.map(a => {
            const needsYou = a.current_state === 'INFO_REQUESTED'

            return (
              <li key={a.application_id}>
                <article className="card">
                  <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.25rem' }}>
                    <Link to={`/applications/${a.application_id}`}>
                      {a.scholarship_title}
                    </Link>
                  </h2>

                  <p className="muted" style={{ marginBottom: '0.5rem' }}>
                    {a.organisation_name}
                    {' · '}
                    <span className="sr-only">{t('appl.reference')} </span>
                    {a.reference_code}
                  </p>

                  <div className="row">
                    <span className={`state-badge ${needsYou ? 'blocked' : 'likely'}`}>
                      {a.state_label}
                    </span>
                    {a.submitted_at && (
                      <span className="muted">{shortDate(a.submitted_at)}</span>
                    )}
                  </div>

                  {/* The one state where the student has to do something. It
                      would be lost among the others without this. */}
                  {needsYou && (
                    <p className="next-action">
                      <span className="mark" aria-hidden="true">!</span>
                      <span>{t('appl.needsYou')}{a.info_request_note ? ` — ${a.info_request_note}` : ''}</span>
                    </p>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
