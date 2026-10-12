import { useCallback, useEffect, useState } from 'react'

import * as api from '../lib/api'
import { fileSize } from '../lib/format'
import { useI18n } from '../lib/i18n-context'
import type { Document } from '../lib/types'
import { Sheet } from './Sheet'

/* A document already on file, shown where the form would ask for it again.
 *
 * The form used to say "Already on file. Choose a new file only to replace it."
 * beside an empty picker reading "No file chosen" — two statements that look
 * like a contradiction, and no way to see which file it meant. So the file is
 * shown instead: a glance-sized preview, its name and size, View for the whole
 * thing and Replace to choose another. Replace only opens the picker; nothing
 * changes on file until the form is submitted, which is when the new one is
 * uploaded.
 *
 * The preview is fetched as Documents' cards fetch theirs — one signed URL,
 * purpose=view, fetched once — and for the same reason: a document vault whose
 * documents cannot be seen is a filing cabinet with the drawers welded shut.
 * If the URL cannot be had, the name and the two buttons still stand. */
export function OnFileDocument({
  doc, label, onReplace,
}: {
  doc: Document
  label: string
  onReplace: () => void
}) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const isImage = /\.(png|jpe?g|webp)$/i.test(doc.original_name)

  const signedURL = useCallback(async (): Promise<string | null> => {
    try {
      const res = await api.get<{ url: string }>(
        `/documents/${doc.document_id}/download`, { purpose: 'view' })
      return res.data.url
    } catch {
      return null
    }
  }, [doc.document_id])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const u = await signedURL()
      if (!cancelled && u) setUrl(u)
    })()
    return () => { cancelled = true }
  }, [signedURL])

  const name = `${label} — ${doc.original_name}`

  /* The document itself, at either size. Same rules as Documents: an image is
     inert, a PDF scrolls and has its download and print toolbar turned off. */
  const view = (className: string) => url && (isImage ? (
    <img className="doc-thumb" src={url} alt={name} referrerPolicy="no-referrer"
         onError={() => { void signedURL().then(u => u && setUrl(u)) }} />
  ) : (
    <iframe className={`doc-thumb doc-thumb-page ${className}`}
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            title={name} referrerPolicy="no-referrer" />
  ))

  return (
    <div className="onfile">
      <div className="doc-preview onfile-preview" aria-busy={!url || undefined}>
        {view('')}
      </div>

      <p className="doc-file">
        <span className="doc-file-name">{doc.original_name}</span>
        <span className="muted">{fileSize(doc.size_bytes)}</span>
      </p>

      <div className="onfile-actions">
        <button type="button" onClick={() => setOpen(true)} disabled={!url}>
          {t('reg.onFileView')}<span className="sr-only"> {label}</span>
        </button>
        <button type="button" onClick={onReplace}>
          {t('reg.onFileReplace')}<span className="sr-only"> {label}</span>
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="onfile-full">{view('onfile-full-page')}</div>
      </Sheet>
    </div>
  )
}
