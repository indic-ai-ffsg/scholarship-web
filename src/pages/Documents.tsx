import { useCallback, useEffect, useRef, useState } from 'react'

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

/* The labels are field.doc.* in the string table. The key is built from the
   enum, so a document type the API adds shows its own enum name until somebody
   writes the label — loud, and in one place. */
const DOC_LABEL_KEY = (type: string) => `field.doc.${type}`

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
    t(DOC_LABEL_KEY(type))

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
    <div className="page docs">
      {/* The shared title band (components/page-hero). */}
      <header className="page-hero">
        <h1>{t('doc.title')}</h1>
        <p className="lede">{t('doc.lede')}</p>
      </header>

      <section className="card doc-upload" aria-labelledby="add-doc">
        <h2 id="add-doc">{t('doc.upload')}</h2>

        {error && <Notice tone="danger">{error}</Notice>}

        {/* What it is and which file, side by side where there is room: two
            answers to one question, and stacked they read as two steps. */}
        <div className="doc-upload-fields">
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
              /* The registration form's drop box: a real file input with the
                 box drawn round it, so Tab reaches it and Enter opens the
                 picker — see .file-input. */
              className="file-input"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              // capture is deliberately absent: offering the camera by default
              // is wrong for somebody who has already scanned the document, and
              // the file picker offers the camera anyway on a phone.
            />
          )}
        </Field>
        </div>

        <button className="primary" onClick={upload} disabled={busy || !docType} aria-busy={busy || undefined}>
          {busy ? t('doc.uploading') : t('doc.upload')}
        </button>
      </section>

      {query.loading && !query.data && <Loading />}
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}

      {query.data && docs.length === 0 && <Empty title={t('doc.none')} />}

      {docs.length > 0 && (
        <ul role="list" className="doc-grid">
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
  const { t, locale } = useI18n()
  const announce = useAnnounce()
  const [busy, setBusy] = useState(false)

  const v = doc.verification
  const expiringSoon = v?.is_live && v.days_to_expiry <= 30
  const expired = v && !v.is_live && v.status === 'VERIFIED'

  /* The preview, fetched as the card mounts.
   *
   * Every document shows its own contents — there is no button, nothing to
   * press, nothing that opens or downloads. A student checking they uploaded
   * the right page should be able to see that it is the right page.
   *
   * The cost is real and it is the reason this was behind a button before: a
   * list of six documents mints six signed URLs, each live for its whole TTL,
   * whether or not anyone looks. That is the trade for a preview that is simply
   * there, and it is a fair one — a document vault whose documents are all
   * invisible is a filing cabinet with the drawers welded shut.
   */
  const [preview, setPreview] = useState<string | null>(null)
  const isImage = /\.(png|jpe?g|webp)$/i.test(doc.original_name)

  /* The preview URL, fetched once and then left alone.
   *
   * It was on a timer, renewed at four fifths of SIGNED_URL_TTL so it could
   * never expire on screen. That cured a real problem and caused a worse one:
   * replacing the src remounts the PDF viewer, which drops the reader back to
   * page one. Anyone reading a multi-page certificate was returned to the start
   * every few minutes — which looks exactly like a preview that will not scroll.
   *
   * A loaded document does not need a live URL. The bytes are in the browser;
   * the signature only mattered at the moment of the request. So the URL is
   * fetched once, and refreshed only if something actually fails — which is
   * what an expired link looks like from here, and the only case the timer was
   * really for.
   */
  const signedURL = useCallback(async (): Promise<string | null> => {
    try {
      // purpose=view leaves the Content-Disposition alone, so the browser
      // renders the file instead of saving it.
      const res = await api.get<{ url: string }>(
        `/documents/${doc.document_id}/download`, { purpose: 'view' })
      return res.data.url
    } catch {
      /* the card still shows its name, type and status */
      return null
    }
  }, [doc.document_id])

  /* Guarded so the effect does not set state on the pass that mounted it —
     which is what the lint rule is about, and is a real cascade rather than a
     style preference. */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const url = await signedURL()
      if (!cancelled && url) setPreview(url)
    })()
    return () => { cancelled = true }
  }, [signedURL])

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
    /* A file card: what it is and where it stands, the document itself, the
       file's particulars, then Remove — the destructive control last and
       apart, rather than between the name and the picture of the thing it
       would destroy. */
    <article className="card doc-card">
      <div className="doc-card-head">
        <h3>{label}</h3>

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

      {/* The document itself, in a frame of fixed height, so a grid of cards
          lines up whatever shape each scan is. Empty until the signed URL
          arrives, and the frame holds its place meanwhile. */}
      <div className="doc-preview">
      {/* #toolbar=0&navpanes=0 removes Chrome's PDF chrome — which is where the
            download and print buttons were, and the reason a "preview" was
            offering a download at all.

            An image is inert — nothing to click, drag or right-click-save. A PDF
            is not, and cannot be: a two-page certificate whose second page is
            unreachable is a preview hiding half the evidence. It scrolls, and
            that is all it does; the toolbar carrying download and print is
            still off. */}
        {preview && (
          isImage ? (
            // alt is the document's own name. Describing the picture is not
            // something this code can do, and "UDID card" is what tells the
            // reader it is the right one.
            <img className="doc-thumb" src={preview}
                 alt={`${label} — ${doc.original_name}`} referrerPolicy="no-referrer"
                 onError={() => { void signedURL().then(u => u && setPreview(u)) }} />
          ) : (
            <iframe className="doc-thumb doc-thumb-page"
                    // FitH fits the page to the frame's width, so the text is
                    // readable at a glance and the rest of the page is below the
                    // fold of the window rather than shrunk to fit it.
                    src={`${preview}#toolbar=0&navpanes=0&view=FitH`}
                    title={`${label} — ${doc.original_name}`}
                    referrerPolicy="no-referrer" />
          )
        )}
      </div>

      <p className="doc-file">
        <span className="doc-file-name">{doc.original_name}</span>
        <span className="muted">{fileSize(doc.size_bytes)}</span>
      </p>

      {v?.is_live && (
        <p className="doc-valid">
          {v.verified_by_organisation && (
            <>{t('doc.verifiedBy', { org: v.verified_by_organisation })}{' · '}</>
          )}
          {t('doc.validUntil', { date: shortDate(v.valid_until, locale) })}
        </p>
      )}

      {/* An expiry warning is the difference between a recoverable problem and
          a missed deadline, so it is a notice rather than a line of grey text. */}
      {expiringSoon && (
        <Notice tone="warn">
          <p>{t('doc.expiring', { n: v!.days_to_expiry })}</p>
        </Notice>
      )}
      {expired && (
        <Notice tone="warn">
          <p>
            {t('doc.expired')} — {shortDate(v!.valid_until, locale)}
          </p>
        </Notice>
      )}

      <div className="doc-card-foot">
        <button
          className="quiet destructive"
          onClick={remove}
          disabled={busy}
          aria-busy={busy || undefined}
          /* Tracks the visible word. 2.5.3 wants the accessible name to
             contain the label somebody can see, and "Removing…" is not inside
             "Remove" — a voice-control user saying "click Remove" during the
             second it runs would otherwise be talking to a name that is no
             longer on screen. */
          aria-label={`${busy ? t('doc.removing') : t('doc.remove')} ${label}`}
        >
          {busy ? t('doc.removing') : t('doc.remove')}
        </button>
      </div>

    </article>
  )
}
