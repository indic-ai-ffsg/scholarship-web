import { useRef, useState } from 'react'

import * as api from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useQuery } from '../lib/hooks'
import { useAnnounce } from '../lib/announce'
import { useI18n } from '../lib/i18n-context'
import { fileSize, shortDate } from '../lib/format'
import { Empty, ErrorState, Field, Loading, Notice } from '../components/ui'
import type { Document } from '../lib/types'

/* The document vault.
 *
 * Section 4.3.2's promise, stated plainly at the top of the page: upload once,
 * and every scholarship you apply to uses the same document. That is the whole
 * economic argument of the platform, and it is worth saying to the person it
 * benefits rather than only to the reader of the design report.
 *
 * Expiry gets prominence because it is the thing that silently blocks a
 * submission (TC-05). A certificate that lapses two weeks before a deadline is
 * a recoverable problem if the student is told, and a missed year if not.
 */

const DOC_TYPES = [
  'DISABILITY_CERTIFICATE', 'UDID_CARD', 'INCOME_CERTIFICATE', 'DOMICILE_CERTIFICATE',
  'CASTE_CERTIFICATE', 'MARKSHEET', 'ADMISSION_LETTER', 'BONAFIDE_CERTIFICATE',
  'FEE_RECEIPT', 'BANK_PASSBOOK', 'IDENTITY_PROOF', 'PHOTOGRAPH',
]

const DOC_LABELS: Record<string, string> = {
  DISABILITY_CERTIFICATE: 'Disability certificate',
  UDID_CARD: 'UDID card',
  INCOME_CERTIFICATE: 'Income certificate',
  DOMICILE_CERTIFICATE: 'Domicile certificate',
  CASTE_CERTIFICATE: 'Category certificate',
  MARKSHEET: 'Marksheet',
  ADMISSION_LETTER: 'Admission letter',
  BONAFIDE_CERTIFICATE: 'Bonafide certificate',
  FEE_RECEIPT: 'Fee receipt',
  BANK_PASSBOOK: 'Bank passbook',
  IDENTITY_PROOF: 'Proof of identity',
  PHOTOGRAPH: 'Photograph',
}

export default function Documents() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const announce = useAnnounce()

  const [docType, setDocType] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const query = useQuery<Document[]>(
    signal => api.get('/me/documents', undefined, signal),
    [],
  )

  const label = (type: string) =>
    DOC_LABELS[type] ?? type

  async function upload() {
    const file = fileInput.current?.files?.[0]
    if (!file || !docType) return

    setBusy(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)
    form.append('doc_type', docType)

    try {
      // FormData rather than the JSON client: the browser must set its own
      // multipart boundary, which it cannot do if a Content-Type is forced.
      await api.upload('/me/documents', form)
      announce(`${label(docType)} ${t('profile.saved')}`, 'ok')
      setDocType('')
      if (fileInput.current) fileInput.current.value = ''
      query.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (!profile) {
    return <div className="page"><Empty title={t('match.none')} hint={t('match.noneHint')} /></div>
  }

  const docs = query.data ?? []

  return (
    <div className="page">
      <h1>{t('doc.title')}</h1>
      <p className="lede">{t('doc.lede')}</p>

      <section className="card" aria-labelledby="add-doc">
        <h2 id="add-doc" style={{ fontSize: 'var(--step-1)' }}>{t('doc.upload')}</h2>

        {error && <Notice tone="danger">{error}</Notice>}

        <Field label={t('doc.type')} required>
          {props => (
            <select {...props} value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="">—</option>
              {DOC_TYPES.map(type => (
                <option key={type} value={type}>{label(type)}</option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('doc.file')} hint={t('doc.fileHint')} required>
          {props => (
            <input
              {...props}
              ref={fileInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              // capture is deliberately absent: offering the camera by default
              // is wrong for somebody who has already scanned the document, and
              // the file picker offers the camera anyway on a phone.
            />
          )}
        </Field>

        <button className="primary" onClick={upload} disabled={busy || !docType}>
          {busy ? t('doc.uploading') : t('doc.upload')}
        </button>
      </section>

      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && docs.length === 0 && <Empty title={t('doc.none')} />}

      {docs.length > 0 && (
        <ul role="list" className="stack" style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
          {docs.map(doc => (
            <li key={doc.document_id}>
              <DocumentCard doc={doc} label={label(doc.doc_type)} onChange={query.reload} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DocumentCard({
  doc, label, onChange,
}: {
  doc: Document
  label: string
  onChange: () => void
}) {
  const { t } = useI18n()
  const announce = useAnnounce()
  const [busy, setBusy] = useState(false)

  const v = doc.verification
  const expiringSoon = v?.is_live && v.days_to_expiry <= 30
  const expired = v && !v.is_live && v.status === 'VERIFIED'

  async function remove() {
    setBusy(true)
    try {
      await api.del(`/documents/${doc.document_id}`)
      announce(`${label} ${t('doc.remove')}`, 'warn')
      onChange()
    } catch {
      /* the list reload will show the truth either way */
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--step-0)' }}>{label}</h3>

        {v?.is_live ? (
          <span className="state-badge eligible">
            <span aria-hidden="true">✓</span>{t('doc.verified')}
          </span>
        ) : expired ? (
          <span className="state-badge blocked">
            <span aria-hidden="true">!</span>{t('doc.expired')}
          </span>
        ) : (
          <span className="state-badge ineligible">{t('doc.pending')}</span>
        )}
      </div>

      <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: 'var(--step--1)' }}>
        {doc.original_name} · {fileSize(doc.size_bytes)}
      </p>

      {v?.is_live && (
        <p style={{ margin: '0.5rem 0 0', fontSize: 'var(--step--1)' }}>
          {v.verified_by_organisation && t('doc.verifiedBy', { org: v.verified_by_organisation })}
          {' · '}
          {t('doc.validUntil', { date: shortDate(v.valid_until) })}
        </p>
      )}

      {/* An expiry warning is the difference between a recoverable problem and
          a missed deadline, so it is a notice rather than a line of grey text. */}
      {expiringSoon && (
        <Notice tone="warn">
          <p style={{ margin: 0 }}>{t('doc.expiring', { n: v!.days_to_expiry })}</p>
        </Notice>
      )}
      {expired && (
        <Notice tone="warn">
          <p style={{ margin: 0 }}>
            {t('doc.expired')} — {shortDate(v!.valid_until)}
          </p>
        </Notice>
      )}

      <p style={{ margin: '0.75rem 0 0' }}>
        <button className="quiet" onClick={remove} disabled={busy}>
          {t('doc.remove')}<span className="sr-only"> {label}</span>
        </button>
      </p>
    </article>
  )
}
