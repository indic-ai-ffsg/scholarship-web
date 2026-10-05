/* The reader's own display settings — the accessibility panel in the masthead.
 *
 * Started from Rakesh's registration design (2026-10-05), which put text size
 * and high contrast beside the form, and widened the same day to every control
 * on the team's list that a web page can actually perform. The ones it cannot
 * — sticky keys, slow keys and the rest that belong to the operating system,
 * and captions for media this site does not have — are left out rather than
 * drawn as buttons that do nothing; components/AccessibilityPanel says which.
 *
 * Kept out of any one page because none of them is about a page: a student who
 * needed the largest text to fill in a form needs it on the list that follows,
 * and a setting that quietly reset would be one to find again on every screen.
 *
 * Each setting is an attribute on <html>, so every stylesheet can read it and
 * no component has to — foundation/display.css holds the rules. The two that
 * script has to act on (stopping the slides, the reading guide) listen for the
 * `display-change` event instead. Remembered in localStorage: it is this
 * reader's preference on this device, and on a shared family phone the next
 * person may want something else. Every read and write is guarded, so blocked
 * storage gives the default page rather than a broken one.
 */

import { useEffect, useState } from 'react'

/* Text size and zoom as steps, not pixels. The type scale is rem, so one root
   percentage moves all text; zoom scales the whole page, images and spacing
   with it. Index 1 of TEXT_STEPS and index 0 of ZOOM_STEPS are the site as
   designed and contrast-checked. */
export const TEXT_STEPS = [87.5, 100, 112.5, 125, 150] as const
export const ZOOM_STEPS = [100, 125, 150, 175, 200] as const
/* Read Aloud's three speeds. Normal is below the engine's 1.0 on purpose
   (2026-10-05: "voice too fast"): a student reading in a second language,
   through a magnifier, or with a learning disability follows a calmer pace,
   and "Fast" is there for anyone who wants the engine's own speed back. */
export const SPEECH_RATES = { slow: 0.7, normal: 0.85, fast: 1.05 } as const
export type SpeechRate = keyof typeof SPEECH_RATES

/* The switches, each an attribute. Order is the panel's order. */
export const FLAGS = [
  'contrast', 'invert', 'grayscale', 'lowSaturation', 'highlightLinks', 'hideImages',
  'textSpacing', 'lineSpacing', 'readableFont', 'readingGuide',
  'focusHighlight',
  'reduceMotion', 'pauseAnimations', 'stopAutoplay',
  'hideDecorative', 'readingMode',
] as const
export type Flag = typeof FLAGS[number]

export type Display = Record<Flag, boolean> & {
  /** Index into TEXT_STEPS. */
  text: number
  /** Index into ZOOM_STEPS. */
  zoom: number
  /** 0 off, 1 large (48px), 2 extra large (72px). One value rather than two
   *  switches, because the two cannot both be on. */
  cursor: 0 | 1 | 2
  speechRate: SpeechRate
  /** The voiceURI the reader chose for Read Aloud, or null for the best one
   *  lib/speech ranks for the page's language. A URI from another device or
   *  browser simply is not found there, and the ranking takes over. */
  voice: string | null
}

export const DEFAULT_DISPLAY: Display = {
  ...(Object.fromEntries(FLAGS.map(f => [f, false])) as Record<Flag, boolean>),
  text: 1,
  zoom: 0,
  cursor: 0,
  speechRate: 'normal',
  voice: null,
}

const KEY = 'display'

export function savedDisplay(): Display {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_DISPLAY
    const saved = JSON.parse(raw) as Partial<Display>
    const out: Display = { ...DEFAULT_DISPLAY }
    for (const f of FLAGS) if (typeof saved[f] === 'boolean') out[f] = saved[f]
    // Anything out of range, from an older build or a hand edit, falls back.
    if (Number.isInteger(saved.text) && saved.text! >= 0 && saved.text! < TEXT_STEPS.length) out.text = saved.text!
    if (Number.isInteger(saved.zoom) && saved.zoom! >= 0 && saved.zoom! < ZOOM_STEPS.length) out.zoom = saved.zoom!
    if (saved.cursor === 1 || saved.cursor === 2) out.cursor = saved.cursor
    if (saved.speechRate && saved.speechRate in SPEECH_RATES) out.speechRate = saved.speechRate
    if (typeof saved.voice === 'string' && saved.voice) out.voice = saved.voice
    return out
  } catch {
    return DEFAULT_DISPLAY
  }
}

export function isDefault(d: Display): boolean {
  return (Object.keys(DEFAULT_DISPLAY) as (keyof Display)[]).every(k => d[k] === DEFAULT_DISPLAY[k])
}

/* data-<kebab-case> on <html>: contrast → data-contrast, lowSaturation →
   data-low-saturation (dataset converts the camelCase itself). */
export function applyDisplay(d: Display) {
  const root = document.documentElement
  for (const f of FLAGS) {
    if (d[f]) root.dataset[f] = 'on'
    else delete root.dataset[f]
  }
  if (d.text === DEFAULT_DISPLAY.text) delete root.dataset.textStep
  else root.dataset.textStep = String(d.text)
  if (d.zoom === 0) delete root.dataset.zoomStep
  else root.dataset.zoomStep = String(d.zoom)
  if (d.cursor === 0) delete root.dataset.cursor
  else root.dataset.cursor = d.cursor === 2 ? 'xlarge' : 'large'
}

export function saveDisplay(d: Display) {
  applyDisplay(d)
  try {
    if (isDefault(d)) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    /* Storage refused: the setting still applies for this page view. */
  }
  window.dispatchEvent(new CustomEvent('display-change'))
}

/* Called once, before the first render, so a reader who chose the largest text
   never sees a frame of the small one. */
export function applySavedDisplay() {
  applyDisplay(savedDisplay())
}

/** The current settings, re-read whenever the panel changes one. */
export function useDisplay(): Display {
  const [d, setD] = useState(savedDisplay)
  useEffect(() => {
    const update = () => setD(savedDisplay())
    window.addEventListener('display-change', update)
    return () => window.removeEventListener('display-change', update)
  }, [])
  return d
}
