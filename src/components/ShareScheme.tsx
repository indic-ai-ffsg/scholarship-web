import { useEffect, useState } from 'react'

import * as api from '../lib/api'
import { useAnnounce } from '../lib/announce'
import { useI18n } from '../lib/i18n-context'
import { useQuery } from '../lib/hooks'
import { IconChat, IconLink, IconMail, IconQR, IconShare } from './icons'

/* Sending a scheme to somebody: WhatsApp, email, the phone's own share sheet,
 * a copied link, and a QR code to hold out across a desk.
 *
 * The words are the API's, not this file's (backend/internal/share). The admin
 * panel shares the same schemes, and the two must send the same message — so
 * neither app composes it. This only chooses the channel.
 *
 * Every channel's message is fetched with the panel rather than on the press.
 * A WhatsApp or mail link has to be in the page before it is pressed: opened
 * after a network wait, the browser treats the new window as a popup nobody
 * asked for and blocks it, and the student is left looking at a button that
 * did nothing.
 *
 * Each link carries where it was sent (?ref=wa and so on), and the site counts
 * an open by channel and nothing else — see lib/visit.ts and migration 0072. */

type Channel = 'wa' | 'mail' | 'link' | 'app' | 'qr'

interface Message {
  url: string
  title: string
  text: string
  email_subject: string
  email_body: string
  image_url: string
  qr_url: string
  closed: boolean
}

export function ShareScheme({ slug }: { slug: string }) {
  const { t, locale } = useI18n()
  const announce = useAnnounce()
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const query = useQuery<Record<Channel, Message>>(
    signal => api.get(`/public/scholarships/${slug}/share`, { lang: locale }, signal),
    [slug, locale],
  )
  const m = query.data

  /* Whether the phone has a share sheet of its own. Most phones do and most
     desktop browsers do not; where it exists it is the one button that reaches
     every app the student actually uses, so it goes first. */
  const canNative = typeof navigator.share === 'function'

  // "Copied" goes back to "Copy link" after a moment, so a second copy is
  // visibly a second copy.
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(id)
  }, [copied])

  // Nothing to share, nothing to draw: a scheme that is not public answers 404.
  if (query.error) return null

  async function native() {
    if (!m) return
    try {
      /* The text alone, which already ends with the link. Passing url as well
         makes most Android targets print the address twice. */
      await navigator.share({ title: m.app.title, text: m.app.text })
    } catch {
      // Dismissed, or refused. Neither is an error worth a message.
    }
  }

  async function copy() {
    if (!m) return
    const link = m.link.url
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      /* No clipboard API — an older browser, or a page not served over https.
         The old way still works almost everywhere. */
      const area = document.createElement('textarea')
      area.value = link
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    announce(t('share.copied'), 'ok')
  }

  const wa = m ? `https://wa.me/?text=${encodeURIComponent(m.wa.text)}` : undefined
  const mail = m
    ? `mailto:?subject=${encodeURIComponent(m.mail.email_subject)}&body=${encodeURIComponent(m.mail.email_body)}`
    : undefined

  return (
    <section aria-labelledby="sheet-share" className="share-scheme">
      <h3 id="sheet-share">{t('share.title')}</h3>

      <div className="share-actions">
        {canNative && (
          <button type="button" onClick={native} disabled={!m}>
            <IconShare /> {t('share.native')}
          </button>
        )}
        {/* Links rather than buttons, because that is what they are: each
            leaves for another app. aria-disabled until the words arrive, so
            the row does not jump when they do. */}
        <a
          className="btn"
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!m || undefined}
        >
          <IconChat /> {t('share.whatsapp')}
          <span className="sr-only"> ({t('common.newTab')})</span>
        </a>
        <a className="btn" href={mail} aria-disabled={!m || undefined}>
          <IconMail /> {t('share.email')}
        </a>
        <button type="button" onClick={copy} disabled={!m}>
          <IconLink /> {copied ? t('share.copied') : t('share.copy')}
        </button>
        <button
          type="button"
          onClick={() => setShowQR(v => !v)}
          aria-expanded={showQR}
          aria-controls="share-qr"
          disabled={!m}
        >
          <IconQR /> {t('share.qr')}
        </button>
      </div>

      {showQR && m && (
        <figure id="share-qr" className="share-qr">
          <img
            src={m.qr.qr_url}
            alt={t('share.qrAlt', { title: m.qr.title })}
            width="240"
            height="240"
          />
          <figcaption className="muted">{t('share.qrHint')}</figcaption>
        </figure>
      )}
    </section>
  )
}
