import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import * as api from '../lib/api'
import { forgetApplied } from '../lib/applied'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useAnnounce } from '../lib/announce'
import { useI18n } from '../lib/i18n-context'
import { withNext } from '../lib/next'
import { Empty, ErrorState, Notice, StateBadge } from '../components/ui'
import type { Application, EligibilityState, Reason, RequiredDocument } from '../lib/types'

/* Applying — UC-04.
 *
 * The flow the report describes: the system pre-fills from the profile,
 * attaches valid verified documents from the vault, the student reviews and
 * submits. The student's actual work here is one checkbox, because everything
 * else was done once, earlier, and is being reused.
 *
 * The alternate flow matters as much as the main one. If a required document is
 * absent or its verification has expired, the submission is blocked and the
 * specific document named — so this page shows the document checklist before
 * the button rather than failing after it.
 */

interface Eligibility {
  eligibility: {
    state: EligibilityState
    missing?: Reason[]
    failures?: Reason[]
    unverified?: Reason[]
  }
  next_action?: string
  /* Optional on the wire, whatever the server means to send.
   *
   * A Go nil slice marshals to `null`, and this field reached here as null the
   * first time a scheme with no required documents was applied for — which
   * white-screened the page, because the line below maps over it. The server no
   * longer sends null (vault.CheckRequirements), and the type says `?` anyway:
   * a client that trusts a server not to send null is one deploy-ordering
   * mistake away from the same blank page. */
  documents?: RequiredDocument[]
  documents_complete: boolean
  can_apply: boolean
  /* Where this scheme is applied for.
   *
   * apply_mode is the field that decides, and it is not the same question as
   * listing_kind (backend 0054). EXTERNAL means no application can be made here
   * at all — the server refuses it and a database trigger refuses it under
   * that — whether or not the sponsor has an account with us. It used to read
   * the kind, which was right until an organisation on the platform could take
   * its applications on its own portal.
   *
   * listing_kind still travels, and it decides only which sentence is true
   * about the sponsor. external_url is guaranteed present when the mode is
   * EXTERNAL. */
  listing_kind?: 'TENANT' | 'CURATED'
  apply_mode?: 'INTERNAL' | 'EXTERNAL'
  external_url?: string
}

export default function Apply() {
  const { scholarshipId } = useParams()
  const { t } = useI18n()
  const { profile } = useAuth()
  const announce = useAnnounce()
  const navigate = useNavigate()

  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  /* The document bundle's own state, kept apart from `busy` and `error`.
   *
   * They belong to submitting an application, which is the other half of this
   * component and unreachable on the branch the bundle lives on — but sharing
   * them would still be wrong, because the two would then be one spinner and
   * one error box for two different actions. The next person to add a third
   * action to this page should add a third pair rather than reuse either. */
  const [bundling, setBundling] = useState(false)
  const [bundleError, setBundleError] = useState<string | null>(null)

  const query = useQuery<Eligibility>(
    signal => api.get(`/me/scholarships/${scholarshipId}/eligibility`, undefined, signal),
    [scholarshipId],
  )

  /* No profile, no eligibility to check.
   *
   * Reachable now that the public site invites somebody to apply before they
   * have an account: they register, and an account created a minute ago holds
   * nothing. The API answers that request with a refusal, which would arrive
   * here as a red error box for having done exactly what the site asked. This
   * says what is missing instead, and the scholarship comes back with them —
   * see lib/next.ts. */
  if (!profile) {
    return (
      <div className="page">
        <Empty
          title={t('apply.needProfile')}
          hint={t('apply.needProfileHint')}
          action={
            /* withNext, and to the form rather than to /profile.
             *
             * This read `/profile?next=...`, which lost the scholarship twice
             * over: /profile is the read-only review and it redirects to the
             * form when there is no profile to review, and that redirect is a
             * bare Navigate that does not carry a query string - so a student
             * who pressed this arrived at an empty form with no idea what they
             * had been applying for, and finishing it dropped them at the
             * default destination rather than at the scholarship. */
            <Link className="btn primary" to={withNext('/register', `/apply/${scholarshipId}`)}>
              {t('profile.start')}
            </Link>
          }
        />
      </div>
    )
  }

  /* The page keeps its shape while the check runs.
   *
   * This was `<div className="page"><Loading /></div>`, which is one line of
   * text at the top of an otherwise empty document — and since main now grows
   * to fill the viewport, that rendered as most of a screen of flat colour with
   * "Loading..." stranded at the top. Measured after pressing Apply on a
   * throttled connection: about 700ms of blank page, then the two white cards
   * appearing at once. That is the flash.
   *
   * The heading is drawn immediately, because it is known immediately — this is
   * the Apply screen whatever the answer turns out to be — and the skeleton
   * holds the two cards' worth of space beneath it. Nothing moves when the data
   * lands; the outlines fill in.
   *
   * aria-busy on a live region rather than a visual spinner alone, so the wait
   * is announced once and the shapes stay decorative. */
  if (query.loading) {
    return (
      <div className="page narrow">
        <h1>{t('apply.title')}</h1>
        <p className="sr-only" role="status" aria-busy="true">{t('common.loading')}</p>
        <div className="skeleton-card" aria-hidden="true">
          <span className="skeleton-line head" />
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
        </div>
        <div className="skeleton-card" aria-hidden="true">
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
          <span className="skeleton-line button" />
        </div>
      </div>
    )
  }
  if (query.error) return <div className="page narrow"><ErrorState error={query.error} onRetry={query.reload} /></div>
  if (!query.data) return null

  /* Fetch the zip and hand it to the browser.
   *
   * Announced on both outcomes. The download itself is silent — the file lands
   * in a folder and the page does not change — so a student who cannot see the
   * browser's download shelf has no way to know the press worked, and the
   * obvious conclusion is that it did not. The refusals are worth hearing too:
   * the server says "those come to 63 MB together, save them one at a time"
   * rather than a status code, and that sentence is the whole reason
   * api.download parses the error envelope. */
  async function collectDocuments() {
    setBundling(true)
    setBundleError(null)
    try {
      await api.download(`/me/scholarships/${scholarshipId}/document-bundle`)
      announce(t('apply.bundleDone'), 'ok')
    } catch (err) {
      const message = api.errorDetail(err, t('common.error'))
      setBundleError(message)
      announce(message, 'warn')
    } finally {
      setBundling(false)
    }
  }

  /* A scheme applied for somewhere else, reached here anyway.
   *
   * Every Apply button now goes straight to the sponsor for these, so nothing
   * on the site routes here — but the address is a plain URL: it is in browser
   * histories, in anything already shared, and in links sent before any of this
   * was fixed. So the page has to answer, and what it answers is the whole
   * point of the change.
   *
   * It used to answer with a Notice: a bordered panel, headed "This one is
   * applied for on the sponsor's own site", in the place where a form should
   * have been. Everything in that sentence was true and the shape of it was
   * wrong. A student who pressed Apply and landed on an interruption panel has
   * been told, in the vocabulary the rest of the portal uses for problems, that
   * something went wrong with their application — and the portal uses exactly
   * that panel to say a submission was blocked. This was the "external looks
   * like a failure" complaint in one component.
   *
   * So it is an ordinary page now, with a heading and a paragraph and the two
   * things a student actually wants at this moment: the way to the sponsor, and
   * their documents in a form they can hand over. No border, no tone, nothing
   * that reads as an interruption — because it is not one. Applying somewhere
   * else is a normal way to apply, and most of the money in this catalogue is
   * given away that way.
   *
   * The mode, not the kind. A partner organisation's own portal reaches this
   * page too, and calling that "a scheme we merely list" in front of the
   * student would be wrong about the partner. */
  if (query.data.apply_mode === 'EXTERNAL') {
    const away = query.data.external_url
    const partner = query.data.listing_kind === 'TENANT'
    return (
      <div className="page narrow">
        <h1>{t('apply.elsewhereTitle')}</h1>
        <p>{t(partner ? 'apply.elsewhereBodyPartner' : 'apply.elsewhereBody')}</p>

        {away && (
          <p>
            <a className="btn primary" href={away} target="_blank" rel="noopener noreferrer">
              {t('public.applyExternal')}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> ({t('common.newTab')})</span>
            </a>
          </p>
        )}

        {/* The documents, as one file to take with them.
         *
         * This is the concrete cost of an external application and the only
         * part of it the platform can actually remove. The sponsor's form will
         * ask for a disability certificate, an income certificate and a
         * marksheet — every one of them already here, already verified, and
         * unreachable from the page the student is looking at. Without this the
         * realistic outcome is that they photograph the lot again on a phone,
         * badly, because that is quicker than working out which of eleven files
         * in their downloads folder is the right one.
         *
         * A button rather than a link, because it cannot be a link: the session
         * is a bearer token held in memory, so a navigation to a protected
         * endpoint arrives unauthenticated. api.download carries the header and
         * hands the blob to the browser — see the note on it. */}
        <h2>{t('apply.bundleTitle')}</h2>
        <p>{t('apply.bundleBody')}</p>
        {bundleError && <Notice tone="warn">{bundleError}</Notice>}
        <p>
          <button
            type="button"
            className="btn"
            onClick={collectDocuments}
            disabled={bundling}
            /* Announced, not only greyed. A zip of four scans takes a few
               seconds on a phone connection and the press gives no other
               feedback, so without this a student presses it again — and the
               second press is another read of every one of those objects. */
            aria-busy={bundling || undefined}
          >
            {bundling ? t('apply.bundleWorking') : t('apply.bundleAction')}
          </button>
        </p>
      </div>
    )
  }

  const { eligibility, can_apply: canApply } = query.data
  // Defaulted here rather than at each use: this is read in four places below,
  // and three of them would be a second chance to forget.
  const documents = query.data.documents ?? []
  const shared = [...new Set(documents.map(d => d.label))].join(', ')

  async function submit() {
    setBusy(true)
    setError(null)
    setBlocked(null)

    try {
      const res = await api.post<{
        application?: Application
        blocked: boolean
        blocked_reason?: string
      }>('/me/applications', {
        scholarship_id: scholarshipId,
        /* The box, not a literal.
         *
         * This sent `true` unconditionally while the button beside it is
         * disabled until the box is ticked — so the two agreed, by luck rather
         * than by construction. Consent is the one field on this platform where
         * that is not good enough: it is recorded per application under the
         * DPDP Act and shown back to the student as something they did. Sending
         * the control's own value means a change to the gate cannot quietly
         * start recording a consent nobody gave. */
        consent_given: consent,
        // A retry over a flaky connection must not produce a second
        // application; the server recognises the key and returns the first.
        idempotency_key: `apply-${scholarshipId}`,
      })

      if (res.data.blocked) {
        setBlocked(res.data.blocked_reason ?? t('apply.blocked'))
        announce(res.data.blocked_reason ?? t('apply.blocked'), 'warn')
        query.reload()
        return
      }

      /* The directory's "have I applied" cache is now a lie by exactly one
         entry. Dropped rather than patched: re-asking costs one small request
         the next time a list is opened, and a cache updated by hand at each
         call site is one that goes stale at the site somebody forgets. */
      forgetApplied()

      announce(t('apply.submit'), 'ok')
      navigate(`/applications/${res.data.application!.application_id}`)
    } catch (err) {
      /* The field the server named, not the sentence that names none.
       *
       * A validation failure arrives as "Some of the details you entered need
       * attention" with a map saying which — and this discarded the map. On a
       * screen whose only control is Send my application, that sentence is a
       * dead end: nothing on the page is marked, and there is nothing to go and
       * change. */
      setError(api.errorDetail(err, t('common.error')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <h1>{t('apply.title')}</h1>

      <div className="row" style={{ marginBottom: '1rem' }}>
        <StateBadge state={eligibility.state} />
      </div>

      {blocked && <Notice tone="warn" title={t('apply.blocked')}><p>{blocked}</p></Notice>}
      {error && <Notice tone="danger">{error}</Notice>}

      {!canApply && !blocked && (
        <Notice tone="warn" title={t('apply.blocked')}>
          <p>{query.data.next_action}</p>
        </Notice>
      )}

      {/* Every document, with its state. A student who cannot submit should be
          able to see at a glance which line is the problem.
          *
          * Hidden entirely when the scheme asks for none, which is ordinary
          * rather than a gap: a curated listing carries no required documents
          * by design, and one converted onto the platform inherits that. The
          * heading was rendering over an empty list, which reads as a section
          * that failed to load rather than as a scheme with nothing to
          * upload. */}
      {documents.length > 0 && (
      <section className="card" aria-labelledby="docs">
        <h2 id="docs" style={{ fontSize: 'var(--step-1)' }}>{t('apply.docs')}</h2>

        <ul role="list" className="stack tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {documents.map(doc => (
            <li key={doc.doc_type} className="row" style={{ alignItems: 'flex-start', gap: '0.625rem' }}>
              <span
                aria-hidden="true"
                style={{
                  color: doc.satisfied ? 'var(--eligible)' : 'var(--blocked)',
                  fontWeight: 700, fontSize: '1.1em',
                }}
              >
                {doc.satisfied ? '✓' : '!'}
              </span>
              <span>
                <strong>{doc.label}</strong>
                <span className="sr-only">
                  {' — '}{doc.satisfied ? t('doc.verified') : t('match.blocked')}
                </span>
                {doc.reason && (
                  <span className="muted" style={{ display: 'block', fontSize: 'var(--step--1)' }}>
                    {doc.reason}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {!query.data.documents_complete && (
          <p style={{ marginTop: '1rem', marginBottom: 0 }}>
            <Link className="btn" to="/documents">{t('nav.documents')}</Link>
          </p>
        )}
      </section>
      )}

      {/* Consent, recorded per application with a stated purpose and an
          enumerated field list. The DPDP Act requires the record; naming the
          fields is what makes it meaningful to the person giving it. */}
      <section className="card">
        <label className="choice" style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
          />
          <span>
            <span className="label">{t('apply.consent')}</span>
            <span className="sub">
              {shared
                ? t('apply.consentBody', { fields: shared })
                : t('apply.consentBodyNoDocs')}
            </span>
          </span>
        </label>

        <button
          className="primary wide"
          style={{ marginTop: '1rem' }}
          onClick={submit}
          disabled={busy || !consent || !canApply}
          aria-busy={busy || undefined}
        >
          {busy ? t('apply.submitting') : t('apply.submit')}
        </button>
      </section>
    </div>
  )
}
