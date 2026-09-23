import * as api from './api'
import type { Document } from './types'

/* The helpers behind components/Avatar, apart from it so that file exports a
   component and nothing else — which is what keeps hot reload working. */

/* Up to two initials, from words: "Sudip De" is SD. */
export function initials(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/* The photograph's URL, looked up once and shared.
 *
 * The avatar is in the account menu now, on every signed-in page, and on the
 * profile twice over. Each of those asking for itself would be the documents
 * list and a freshly minted signed URL per render. So the lookup is one promise
 * held for a few minutes — short enough that a photograph uploaded a moment ago
 * appears on the next page after that, long enough that moving around the
 * portal costs one request, not one per screen. The URL is the same short-lived
 * view link My documents uses (purpose=view renders rather than downloads). */
const PHOTO_TTL_MS = 5 * 60 * 1000
let cached: { at: number; url: Promise<string | null> } | null = null

export function photoURL(): Promise<string | null> {
  if (cached && Date.now() - cached.at < PHOTO_TTL_MS) return cached.url
  const url = (async () => {
    try {
      const docs = await api.get<Document[]>('/me/documents')
      const photo = docs.data
        .filter(d => d.doc_type === 'PHOTOGRAPH' && /\.(png|jpe?g|webp)$/i.test(d.original_name))
        .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0]
      if (!photo) return null
      const res = await api.get<{ url: string }>(
        `/documents/${photo.document_id}/download`, { purpose: 'view' })
      return res.data.url
    } catch {
      return null
    }
  })()
  cached = { at: Date.now(), url }
  return url
}

/* Dropped on sign-out, so the next student on a shared handset does not see
   the last one's photograph for five minutes. */
export function forgetAvatar() {
  cached = null
}
