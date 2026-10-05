/* The accessibility controls, inside the masthead's ♿ menu.
 *
 * Every control on the team's list (2026-10-05) that a web page can perform,
 * labelled as actions — "Increase Text Spacing", not "Text spacing" — because a
 * button's name should say what pressing it does.
 *
 * Left out, deliberately, because a page cannot do them and a button that does
 * nothing is worse than none:
 *
 *   - Sticky Keys, Slow Keys, Keyboard Navigation and Click Assistance belong to
 *     the operating system. The site already works from the keyboard alone, and
 *     a page that tried to delay or latch key presses would fight the student's
 *     own settings and their screen reader.
 *   - Captions, Live Captions, Audio Descriptions and Mute Sounds: the site has
 *     no video and plays no sound. They belong here the day it does.
 *   - Disable Blinking: nothing on the site blinks. Pause Animations stops the
 *     one thing that pulses, the loading shimmer.
 *   - Focus Mode, Simplify Page and Reduce Distractions are one request in
 *     three wordings, and are Reading Mode here, with Hide Decorative Content.
 *
 * Every switch is a real <button aria-pressed>, so a screen reader says
 * "High Contrast, toggle button, pressed". The visible "On"/"Off" says the same
 * in words for the eye, so the state never rests on colour; it is aria-hidden
 * because the pressed state already says it to the ear.
 *
 * Read Aloud is for a reader who is not running assistive software — low
 * vision, reading slowly, more at home in spoken Hindi than in print. A screen
 * reader user brings a better reader, and nothing here speaks unless asked.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { useI18n } from '../lib/i18n-context'
import { useAnnounce } from '../lib/announce'
import {
  DEFAULT_DISPLAY, SPEECH_RATES, TEXT_STEPS, ZOOM_STEPS,
  isDefault, saveDisplay, savedDisplay, type Display, type Flag, type SpeechRate,
} from '../lib/display'
/* canSpeak decides whether Read Aloud is drawn at all. */
import { NoVoiceError, canSpeak, rankedVoices, speak, speakParts, stopSpeaking, voices } from '../lib/speech'
import { highlight, segments } from '../lib/read-page'

export function AccessibilityPanel() {
  const { t, locale } = useI18n()
  const announce = useAnnounce()
  const [d, setD] = useState<Display>(savedDisplay)
  const [reading, setReading] = useState(false)
  /* Why reading did not start, in words, or null. A silent button is the
     failure this replaced. */
  const [readError, setReadError] = useState<string | null>(null)

  /* The voices this device offers for the page's language, best first, for
     the Voice picker. Loaded after mount — Chrome fills the list late — and
     again when the language changes, since a Hindi page wants Hindi voices. */
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!canSpeak) return
    let live = true
    void voices().then(all => { if (live) setVoiceList(rankedVoices(all, locale)) })
    return () => { live = false }
  }, [locale])

  // Leaving the app stops the voice with it.
  useEffect(() => () => stopSpeaking(), [])

  /* And so does leaving the page. The panel lives in the masthead, which
     outlives every route, so without this a student who pressed a link kept
     hearing the page they had left read over the one they arrived at. The
     stop settles readAloud's promise, whose finally puts the button back. */
  const { pathname } = useLocation()
  useEffect(() => { stopSpeaking() }, [pathname])

  function update(next: Display, said: string) {
    saveDisplay(next)
    setD(next)
    /* Spoken, not shown: the button pressed already says "On" or "Off", and a
       toast per press piled up over the page the reader was adjusting. */
    announce(said, 'ok', { spokenOnly: true })
  }

  function toggle(flag: Flag, labelKey: string) {
    const on = !d[flag]
    update({ ...d, [flag]: on }, t(on ? 'a11y.changedOn' : 'a11y.changedOff', { name: t(labelKey) }))
  }

  /* aria-disabled rather than disabled on every stepper button and Reset: a
     disabled button drops the focus it holds, and pressing Increase at the
     largest size would leave a keyboard user on the page body with the menu
     still open. These keep focus, and the clamp below makes the press a
     no-op that still says where the limit is. */
  function textTo(step: number) {
    const next = Math.max(0, Math.min(TEXT_STEPS.length - 1, step))
    update({ ...d, text: next }, t('a11y.textSize', { n: TEXT_STEPS[next] }))
  }

  function zoomTo(step: number) {
    const next = Math.max(0, Math.min(ZOOM_STEPS.length - 1, step))
    update({ ...d, zoom: next }, t('a11y.zoomNow', { n: ZOOM_STEPS[next] }))
  }

  function cursorTo(size: 1 | 2, labelKey: string) {
    const next = d.cursor === size ? 0 : size
    update({ ...d, cursor: next }, t(next ? 'a11y.changedOn' : 'a11y.changedOff', { name: t(labelKey) }))
  }

  function rateTo(rate: SpeechRate) {
    update({ ...d, speechRate: rate }, t('a11y.rateNow', { rate: t(`a11y.rate.${rate}`) }))
  }

  /* Reads what the student selected, if anything, and otherwise the page —
     <main>, not the masthead and footer around it. innerText skips whatever is
     hidden, so on the registration form it reads the step on screen. */
  async function readAloud() {
    if (reading) {
      stopSpeaking()
      setReading(false)
      return
    }
    /* The selection if there is one, otherwise the whole of <main>, as
       sentences that each know where they are on the page (lib/read-page). */
    const selection = window.getSelection()
    let scope: Range | null = null
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      scope = selection.getRangeAt(0).cloneRange()
    } else {
      const main = document.getElementById('main')
      if (main) { scope = document.createRange(); scope.selectNodeContents(main) }
    }
    if (!scope) return
    const segs = segments(scope)
    if (segs.length === 0) return
    /* The menu covers the top of the page, and the yellow sentence is the
       thing to watch now: closed, so the reader sees it. */
    const menu = document.querySelector<HTMLDetailsElement>('.menu.a11y')
    if (menu) menu.open = false

    setReadError(null)
    setReading(true)
    try {
      // lib/speech carries the reasons this is more than one call.
      await speakParts(segs.map(s => s.text), locale, SPEECH_RATES[d.speechRate], d.voice,
        i => highlight(segs[i].range))
    } catch (err) {
      setReadError(t(err instanceof NoVoiceError ? 'a11y.noVoice' : 'a11y.readFailed'))
    } finally {
      highlight(null)
      setReading(false)
    }
  }

  function chooseVoice(uri: string) {
    const voice = voiceList.find(v => v.voiceURI === uri)
    update({ ...d, voice: uri || null }, t('a11y.voiceNow', { name: voice?.name ?? t('a11y.voiceBest') }))
  }

  /* One sentence in the chosen voice, so a reader can compare voices without
     sitting through a whole page in each. Same path as Read Aloud, so what is
     heard here is exactly what Read Aloud will sound like. */
  async function testVoice() {
    setReadError(null)
    setReading(true)
    try {
      await speak(t('a11y.voiceSample'), locale, SPEECH_RATES[d.speechRate], d.voice)
    } catch (err) {
      setReadError(t(err instanceof NoVoiceError ? 'a11y.noVoice' : 'a11y.readFailed'))
    } finally {
      setReading(false)
    }
  }

  function resetAll() {
    stopSpeaking()
    setReading(false)
    update(DEFAULT_DISPLAY, t('a11y.resetDone'))
  }

  const toggleButton = (flag: Flag, labelKey: string, icon: string) => (
    <Toggle on={d[flag]} label={t(labelKey)} icon={icon} onClick={() => toggle(flag, labelKey)}
      state={t(d[flag] ? 'a11y.on' : 'a11y.off')} />
  )

  return (
    <div className="a11y-panel">
      <h2 className="a11y-title">{t('a11y.title')}</h2>

      <Group id="a11y-vision" title={t('a11y.vision')}>
        {toggleButton('contrast', 'a11y.contrast', '🔲')}
        {toggleButton('invert', 'a11y.invert', '◐')}
        {toggleButton('grayscale', 'a11y.grayscale', '◑')}
        {toggleButton('lowSaturation', 'a11y.lowSaturation', '🎨')}
        {toggleButton('highlightLinks', 'a11y.highlightLinks', '🔗')}
        {toggleButton('hideImages', 'a11y.hideImages', '🖼️')}
        {/* Zoom is a wide-screen control; foundation/display.css says why.
            Hidden by CSS rather than by script, so a window resized across
            the line swaps one for the other. */}
        <div className="a11y-zoom">
          <p className="a11y-now">{t('a11y.zoomNow', { n: ZOOM_STEPS[d.zoom] })}</p>
          <Stepper
            down={{ glyph: '🔎', label: t('a11y.zoomOut'), off: d.zoom === 0, onClick: () => zoomTo(d.zoom - 1) }}
            reset={{ label: t('a11y.zoomReset'), off: d.zoom === 0, onClick: () => zoomTo(0) }}
            up={{ glyph: '🔍', label: t('a11y.zoomIn'), off: d.zoom === ZOOM_STEPS.length - 1, onClick: () => zoomTo(d.zoom + 1) }}
          />
        </div>
        <p className="a11y-hint a11y-zoom-phone">{t('a11y.zoomPhone')}</p>
      </Group>

      <Group id="a11y-reading" title={t('a11y.reading')}>
        {/* The current size in words, so the effect of a press is readable
            without comparing the page against memory. */}
        <p className="a11y-now">{t('a11y.textSize', { n: TEXT_STEPS[d.text] })}</p>
        <Stepper
          down={{ glyph: 'A−', label: t('a11y.decrease'), off: d.text === 0, onClick: () => textTo(d.text - 1) }}
          reset={{ label: t('a11y.resetText'), off: d.text === DEFAULT_DISPLAY.text, onClick: () => textTo(DEFAULT_DISPLAY.text) }}
          up={{ glyph: 'A+', label: t('a11y.increase'), off: d.text === TEXT_STEPS.length - 1, onClick: () => textTo(d.text + 1) }}
        />
        {toggleButton('textSpacing', 'a11y.textSpacing', '↔')}
        {toggleButton('lineSpacing', 'a11y.lineSpacing', '↕')}
        {toggleButton('readableFont', 'a11y.readableFont', 'Aa')}
        {toggleButton('readingGuide', 'a11y.readingGuide', '▭')}
        {canSpeak && (
          <button type="button" className="a11y-toggle a11y-read" onClick={readAloud} aria-describedby="a11y-read-hint">
            <span className="a11y-icon" aria-hidden="true">{reading ? '■' : '🔊'}</span>
            <span className="a11y-name">{t(reading ? 'a11y.stopReading' : 'a11y.readAloud')}</span>
          </button>
        )}
        {canSpeak && <p className="a11y-hint" id="a11y-read-hint">{t('a11y.readHint')}</p>}
        {/* role="alert": the reader pressed a button and heard nothing, and
            this is the sentence that says why. */}
        {readError && <p className="error" role="alert">{readError}</p>}
      </Group>

      <Group id="a11y-motor" title={t('a11y.motor')}>
        {/* Two buttons for one setting: pressing either turns the other off,
            and aria-pressed on both says which is in force. */}
        <Toggle on={d.cursor === 1} label={t('a11y.largeCursor')} icon="➚"
          state={t(d.cursor === 1 ? 'a11y.on' : 'a11y.off')} onClick={() => cursorTo(1, 'a11y.largeCursor')} />
        <Toggle on={d.cursor === 2} label={t('a11y.xlCursor')} icon="➚"
          state={t(d.cursor === 2 ? 'a11y.on' : 'a11y.off')} onClick={() => cursorTo(2, 'a11y.xlCursor')} />
        {toggleButton('focusHighlight', 'a11y.focusHighlight', '▣')}
      </Group>

      <Group id="a11y-motion" title={t('a11y.motion')}>
        {toggleButton('reduceMotion', 'a11y.reduceMotion', '🐢')}
        {toggleButton('pauseAnimations', 'a11y.pauseAnimations', '⏸')}
        {toggleButton('stopAutoplay', 'a11y.stopAutoplay', '⏹')}
      </Group>

      {canSpeak && (
        <Group id="a11y-audio" title={t('a11y.audio')}>
          {/* A choice of three, so a group of pressed buttons: the rate Read
              Aloud speaks at. */}
          <p className="a11y-now" id="a11y-rate">{t('a11y.speechRate')}</p>
          <div className="a11y-stepper" role="group" aria-labelledby="a11y-rate">
            {(Object.keys(SPEECH_RATES) as SpeechRate[]).map(r => (
              <button key={r} type="button" aria-pressed={d.speechRate === r} onClick={() => rateTo(r)}>
                <span className="a11y-name">{t(`a11y.rate.${r}`)}</span>
              </button>
            ))}
          </div>

          {/* The voice, from what this device has. A native <select>: every
              screen reader and phone handles it, and the list can be long.
              "Best available" is the ranking in lib/speech, and stays the
              right answer when the language changes. */}
          {voiceList.length > 0 && (
            <>
              <label className="a11y-now" htmlFor="a11y-voice">{t('a11y.voice')}</label>
              <select
                id="a11y-voice"
                className="a11y-voice"
                value={d.voice && voiceList.some(v => v.voiceURI === d.voice) ? d.voice : ''}
                onChange={e => chooseVoice(e.target.value)}
              >
                <option value="">{t('a11y.voiceBest')} — {voiceList[0].name}</option>
                {voiceList.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
              <button type="button" className="a11y-toggle a11y-test" onClick={testVoice} aria-disabled={reading}>
                <span className="a11y-icon" aria-hidden="true">▶</span>
                <span className="a11y-name">{t('a11y.voiceTest')}</span>
              </button>
              <p className="a11y-hint">{t('a11y.voiceHint')}</p>
            </>
          )}
        </Group>
      )}

      <Group id="a11y-cognitive" title={t('a11y.cognitive')}>
        {toggleButton('readingMode', 'a11y.readingMode', '📖')}
        {toggleButton('hideDecorative', 'a11y.hideDecorative', '✂')}
      </Group>

      <button type="button" className="a11y-reset" onClick={resetAll} aria-disabled={isDefault(d) && !reading}>
        {t('a11y.resetAll')}
      </button>
    </div>
  )
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="a11y-group" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  )
}

function Toggle({ on, label, icon, state, onClick }: {
  on: boolean; label: string; icon: string; state: string; onClick: () => void
}) {
  return (
    <button type="button" className="a11y-toggle" aria-pressed={on} onClick={onClick}>
      <span className="a11y-icon" aria-hidden="true">{icon}</span>
      <span className="a11y-name">{label}</span>
      <span className="a11y-state" aria-hidden="true">{state}</span>
    </button>
  )
}

interface Step { glyph?: string; label: string; off: boolean; onClick: () => void }

/* Smaller, back to normal, larger — the same three buttons for text and zoom. */
function Stepper({ down, reset, up }: { down: Step; reset: Step; up: Step }) {
  return (
    <div className="a11y-stepper">
      {[down, reset, up].map(s => (
        <button key={s.label} type="button" aria-disabled={s.off} onClick={s.onClick}>
          {s.glyph && <span aria-hidden="true">{s.glyph}</span>}
          <span className="a11y-name">{s.label}</span>
        </button>
      ))}
    </div>
  )
}
