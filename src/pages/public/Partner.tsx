import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../../lib/api'
import { useQuery } from '../../lib/hooks'
import { useI18n } from '../../lib/i18n-context'
import { count } from '../../lib/format'
import { Field, Notice, StateBadge } from '../../components/ui'
import { ListingCard } from './Directory'
import type { EligibilityState, Facet, Listing } from '../../lib/types'

/* Partnering, and why this page is not the usual one.
 *
 * The usual one — every scholarship platform has it — opens with numbers. Lives
 * transformed, funds managed, esteemed partners, registered students. Then a
 * list of services in the same voice: end-to-end, technology-driven,
 * transparent. It works for a platform with a decade of numbers behind it. This
 * one does not have them, and inventing them on a page that asks funders for
 * money would be the single worst thing on this site.
 *
 * So this page does the thing that platform cannot do, and it costs us nothing
 * because the product is already public: it shows the funder what their scheme
 * becomes. A real card, pulled live from the directory. The four states a
 * student actually sees. The real count of what is running. Somebody deciding
 * whether to put a scholarship here can look at the artefact rather than at an
 * adjective — and check it on the next page.
 *
 * The three sections after that are the honest version of "why choose us":
 * what the platform does for you, what it asks of you, and what it does not do.
 * A partner page that lists only the first is a page that will be argued about
 * later.
 *
 * ---------------------------------------------------------------------------
 * Why there is no application form
 * ---------------------------------------------------------------------------
 *
 * There was one, and it asked for a registration number, a full address and a
 * pincode before anybody had spoken to anybody. An organisation deciding
 * whether this platform is for them is not filling in a form; they want a
 * conversation. Four fields ask for exactly enough to have one — who you are,
 * what kind of organisation, and where to write back — and the details that a
 * real application needs are collected when there is something to apply for.
 */
export default function Partner() {
  const { t } = useI18n()

  /* Live, and deliberately so. Every number and the example scheme come from
   * the same endpoint the public directory uses, so nothing on this page can
   * drift from what a visitor sees when they go and look. */
  const query = useQuery<{ listings: Listing[]; facets: Record<string, Facet[]> }>(
    signal => api.get('/public/scholarships', { sort: 'award', page_size: 20 }, signal),
    [],
  )

  const listings = query.data?.listings ?? []
  const facets = query.data?.facets ?? {}
  const open = query.meta?.total ?? listings.length
  const providers = new Set(listings.map(l => l.organisation_name)).size
  const states = facets.state_code?.length ?? 0
  const example = listings[0]

  return (
    <div className="page partner-page">
      <section className="partner-hero">
        <div>
          <h1>{t('partner.title')}</h1>
          <p className="lede">{t('partner.lede')}</p>

          <div className="row">
            <a className="btn primary" href="#talk">{t('partner.talk')}</a>
            <Link className="btn" to="/scholarships">{t('partner.seeLive')}</Link>
          </div>

          {/* Real counts, small, next to the claim rather than blown up into a
              wall of tiles. Three true numbers read as confidence; five
              rounded-up ones read as a brochure. */}
          {open > 0 && (
            <p className="partner-counts">
              <strong>{count(open)}</strong> {t('impact.open').toLowerCase()}
              {' · '}
              <strong>{count(providers)}</strong> {t('impact.providers').toLowerCase()}
              {' · '}
              <strong>{count(states)}</strong> {t('impact.states').toLowerCase()}
              {' · '}
              <Link to="/impact">{t('partner.seeFigures')}</Link>
            </p>
          )}
        </div>

        {/* The show-don't-tell half: the funder's scheme, as the student meets
            it. Rendered with the same component the directory uses, from the
            same data, so it cannot become a flattering mock-up. */}
        {example && (
          <aside className="partner-example" aria-labelledby="example-heading">
            <h2 id="example-heading">{t('partner.exampleTitle')}</h2>
            <p className="muted">{t('partner.exampleBody')}</p>
            <ListingCard listing={example} />
          </aside>
        )}
      </section>

      {/* What the student is told, which is what a funder is really buying: a
          decision with a reason attached, not a yes/no. */}
      <section className="home-section" aria-labelledby="states-heading">
        <h2 id="states-heading">{t('partner.statesTitle')}</h2>
        <p className="lede">{t('partner.statesBody')}</p>

        <ul role="list" className="state-explainer">
          {(['ELIGIBLE', 'LIKELY_ELIGIBLE', 'BLOCKED', 'NOT_ELIGIBLE'] as EligibilityState[]).map(s => (
            <li key={s}>
              <StateBadge state={s} />
              <p className="muted">{t(`partner.state.${s}`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="does-heading">
        <h2 id="does-heading">{t('partner.doesTitle')}</h2>

        <ul role="list" className="partner-grid">
          {['rules', 'documents', 'money', 'record'].map(k => (
            <li key={k} className="card">
              <h3>{t(`partner.does.${k}`)}</h3>
              <p className="muted">{t(`partner.does.${k}Body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* The half of the bargain nobody puts on a partner page. */}
      <section className="home-section" aria-labelledby="asks-heading">
        <h2 id="asks-heading">{t('partner.asksTitle')}</h2>
        <p className="lede">{t('partner.asksBody')}</p>

        <ul role="list" className="partner-grid">
          {['criteria', 'answer', 'verify'].map(k => (
            <li key={k} className="card">
              <h3>{t(`partner.asks.${k}`)}</h3>
              <p className="muted">{t(`partner.asks.${k}Body`)}</p>
            </li>
          ))}
        </ul>

        <Notice tone="info" title={t('partner.notTitle')}>
          <p>{t('partner.notBody')}</p>
        </Notice>
      </section>

      <Talk />
    </div>
  )
}

/* Four fields, and the words matter as much as the count.
 *
 * This is an enquiry, not an application: it reaches the platform's queue as a
 * pending organisation, somebody reads it and writes back. Nothing is approved
 * by filling it in — an approved organisation gains sight of applicants'
 * disability certificates, which is never a form's decision to make. */
function Talk() {
  const { t } = useI18n()

  const [org, setOrg] = useState('')
  const [orgType, setOrgType] = useState('NGO')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})

    try {
      await api.post('/public/organisations', {
        name: org.trim(),
        org_type: orgType,
        // One address, used for both: the person writing is the person to write
        // back to, and asking for an organisation address as well before a
        // conversation has happened is a field for its own sake.
        contact_email: email.trim(),
        admin_name: name.trim(),
        admin_email: email.trim(),
      })
      setDone(true)
    } catch (err) {
      const returned = (err as { fields?: Record<string, string> })?.fields
      if (returned) setFields(returned)
      else setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="partner-talk" id="talk" aria-labelledby="talk-heading">
      <div className="partner-talk-copy">
        <h2 id="talk-heading">{t('partner.talkTitle')}</h2>
        <p>{t('partner.talkBody')}</p>
      </div>

      <div className="card">
        {done ? (
          <Notice tone="good" title={t('partner.doneTitle')}>
            <p>{t('partner.doneBody')}</p>
          </Notice>
        ) : (
          <form onSubmit={submit} noValidate>
            {error && <Notice tone="danger" title={t('common.error')}><p>{error}</p></Notice>}

            <Field label={t('partner.org')} required error={fields.name}>
              {props => (
                <input {...props} value={org} onChange={e => setOrg(e.target.value)} autoComplete="organization" />
              )}
            </Field>

            <Field label={t('partner.type')} required error={fields.org_type}>
              {props => (
                <select {...props} value={orgType} onChange={e => setOrgType(e.target.value)}>
                  <option value="NGO">{t('partner.typeNGO')}</option>
                  <option value="CORPORATE">{t('partner.typeCorporate')}</option>
                  <option value="GOVERNMENT">{t('partner.typeGovernment')}</option>
                  <option value="PRIVATE">{t('partner.typePrivate')}</option>
                </select>
              )}
            </Field>

            <Field label={t('partner.adminName')} required error={fields.admin_name}>
              {props => (
                <input {...props} value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
              )}
            </Field>

            <Field
              label={t('partner.adminEmail')}
              hint={t('partner.adminHint')}
              required
              error={fields.admin_email ?? fields.contact_email}
            >
              {props => (
                <input {...props} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              )}
            </Field>

            <button
              type="submit"
              className="primary wide"
              disabled={busy || !org.trim() || !name.trim() || !email.trim()}
            >
              {busy ? t('partner.sending') : t('partner.submit')}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
