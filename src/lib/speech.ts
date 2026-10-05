/* Read Aloud's engine: the browser's own speechSynthesis, made reliable.
 *
 * The API looks like one call — speak(new SpeechSynthesisUtterance(text)) —
 * and the first version was that one call. It worked on a Mac and was reported
 * as "not working" the same day, because the API fails silently in several
 * well-known ways, and each of them is handled here:
 *
 *   - Chrome cuts an utterance off after about fifteen seconds when the voice
 *     is one of Google's network voices, with no error and no end event. A
 *     page read as one utterance stopped mid-sentence and the button stayed on
 *     "Stop Reading". So the text is spoken in sentence-sized pieces, queued.
 *
 *   - Chrome can drop a speak() that follows a cancel() in the same tick. The
 *     first piece is queued on the next tick after the cancel.
 *
 *   - Android and some desktop builds leave the engine paused after an earlier
 *     interruption, and a paused engine queues forever. resume() first.
 *
 *   - An utterance with no voice and a lang the device has no voice for can be
 *     silent rather than falling back. A voice is chosen explicitly: the
 *     page's language as spoken in India, then that language anywhere, then
 *     Indian English, then any English, then whatever the device has.
 *
 *   - Chrome garbage-collects an utterance nothing references, and its end
 *     event never fires. The queue holds every piece until it is spoken.
 *
 *   - Voices load asynchronously; the list is empty on the first call in
 *     Chrome. speak() waits for voiceschanged, briefly, before choosing.
 *
 * A device with no voices at all gets an error the panel can say in words,
 * rather than a button that does nothing.
 */

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/* Short enough to finish well inside Chrome's cut-off at any rate, long enough
   that a sentence is not broken in the middle where it can be avoided. */
const PIECE = 180

/* Splits on sentence ends — including the danda (।) Hindi and Bengali use — and
   breaks anything still too long at the last space before the limit. */
export function pieces(text: string): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?।॥]+[.!?।॥]*\s*/g) ?? []
  const out: string[] = []
  for (const sentence of sentences) {
    let rest = sentence.trim()
    while (rest.length > PIECE) {
      const cut = rest.lastIndexOf(' ', PIECE)
      const at = cut > PIECE / 2 ? cut : PIECE
      out.push(rest.slice(0, at).trim())
      rest = rest.slice(at).trim()
    }
    if (rest) out.push(rest)
  }
  return out
}

export function voices(): Promise<SpeechSynthesisVoice[]> {
  const now = window.speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise(resolve => {
    const done = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    // Some browsers never fire it; a second is long enough to have loaded.
    setTimeout(done, 1000)
  })
}

/* Which voice, and why the first match was the wrong rule.
 *
 * Read Aloud was reported as working but sounding bad (2026-10-05). Choosing by
 * language alone took the first Indian English voice on the device, and on a
 * Mac that is Rishi — an old compact system voice — ahead of the far better
 * Google and neural voices sitting next to it in the same list. Where no voice
 * matched, the fallback could land on one of macOS's novelty voices, which are
 * jokes ("Bad News", "Bubbles") and were never meant to read a form.
 *
 * So voices are ranked: language first, then quality. The quality signals are
 * the ones vendors put in the name — "Natural" and "Online" on Edge's neural
 * voices, "Google" on Chrome's, "Premium"/"Enhanced" on Apple's downloadable
 * ones — and a network voice ranks above a local one, since the local ones are
 * the compact fallbacks. Chrome cuts network voices off after about fifteen
 * seconds, which is why speak() reads in pieces.
 *
 * The reader can still choose: the panel lists these, best first, and a choice
 * made there wins over the ranking (`preferred`). */
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|pipe organ|ralph|superstar|trinoids|whisper|wobble|zarvox|fred|kathy)\b/i
const QUALITY = /(natural|neural|premium|enhanced|online|wavenet)/i

function langOf(v: SpeechSynthesisVoice) { return v.lang.replace('_', '-').toLowerCase() }

function score(v: SpeechSynthesisVoice, locale: string): number {
  if (NOVELTY.test(v.name)) return -1
  const lang = langOf(v)
  const want = locale.toLowerCase()
  /* The page's language decides first — a Hindi page needs a Hindi voice
     however good the English one is. Within English, an Indian accent is a
     small bonus and no more: smaller than any quality signal, so Google's or a
     neural English voice beats a compact en-IN one, which was the bad sound. */
  let s = want !== 'en' && lang === `${want}-in` ? 5000
    : want !== 'en' && (lang.startsWith(`${want}-`) || lang === want) ? 4000
    : lang.startsWith('en') ? 2000 + (lang === 'en-in' ? 50 : 0)
    : 0
  if (s === 0) return 0
  if (QUALITY.test(v.name)) s += 300
  if (/google/i.test(v.name)) s += 200
  if (!v.localService) s += 100
  return s
}

/** The voices worth offering for a language, best first. The page's own
 *  language where the device has it; English otherwise, since a Maithili page
 *  read by an English voice is better than no reading at all. */
export function rankedVoices(all: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice[] {
  return all
    .map(v => [v, score(v, locale)] as const)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v)
}

export function chooseVoice(
  all: SpeechSynthesisVoice[], locale: string, preferred?: string | null,
): SpeechSynthesisVoice | null {
  const chosen = preferred ? all.find(v => v.voiceURI === preferred) : undefined
  return chosen ?? rankedVoices(all, locale)[0] ?? all.find(v => v.default) ?? all[0] ?? null
}

/* What the eye skips and the voice should too: ticks, arrows, stars, emoji.
   Read out, "check mark" and "asterisk" in the middle of a sentence are what
   made the reading sound broken. The rupee sign is spelt out instead, since
   the amount after it means nothing without it. */
export function speakable(text: string): string {
  return text
    .replace(/₹\s?/g, 'rupees ')
    .replace(/[\p{Extended_Pictographic}\u2190-\u21FF\u2500-\u27BF*•·|]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export class NoVoiceError extends Error {
  constructor() {
    super('No speech voice is installed on this device.')
    this.name = 'NoVoiceError'
  }
}

/* The pieces still to be spoken, held so none is collected before it ends. */
let queue: SpeechSynthesisUtterance[] = []
let session = 0

export function stopSpeaking() {
  session++
  queue = []
  if (canSpeak) window.speechSynthesis.cancel()
}

/** Speaks `text` in `locale`'s voice, split into sentence-sized pieces. */
export function speak(
  text: string, locale: string, rate = 0.85, preferred?: string | null,
): Promise<void> {
  return speakParts(pieces(speakable(text)), locale, rate, preferred)
}

/** Speaks each part in turn and calls `onPart` with its index as it starts —
 *  how Read Aloud moves the yellow highlight. Resolves when the last part has
 *  been spoken or speech was stopped; rejects with NoVoiceError or the
 *  engine's own error. */
export async function speakParts(
  raw: string[], locale: string, rate = 0.85, preferred?: string | null,
  onPart?: (index: number) => void,
): Promise<void> {
  if (!canSpeak) throw new NoVoiceError()
  stopSpeaking()
  const mine = session

  const all = await voices()
  if (mine !== session) return
  const voice = chooseVoice(all, locale, preferred)
  if (!voice) throw new NoVoiceError()

  /* Cleaned for the ear, keeping each part's own index so the highlight lands
     on the sentence actually being said; a part that was only symbols drops. */
  const parts = raw.map((text, index) => ({ text: speakable(text), index })).filter(p => p.text)
  if (parts.length === 0) return

  const synth = window.speechSynthesis
  await new Promise(r => setTimeout(r, 60))
  if (mine !== session) return
  synth.resume()

  /* Speaks parts in one voice. Resolves with the index it got to: list.length
     when it finished or was stopped, or the piece that failed. */
  const run = (v: SpeechSynthesisVoice, list: typeof parts) => new Promise<number>((resolve, reject) => {
    /* Google's network voices speak noticeably faster than the device's own at
       the same rate, so the same "Normal" sounded rushed the moment the
       ranking started preferring them. Scaled down to match by ear. */
    const paced = /google/i.test(v.name) ? rate * 0.9 : rate
    queue = list.map((part, i) => {
      const u = new SpeechSynthesisUtterance(part.text)
      u.voice = v
      u.lang = v.lang
      u.rate = paced
      u.onstart = () => { if (mine === session) onPart?.(part.index) }
      if (i === list.length - 1) u.onend = () => resolve(list.length)
      u.onerror = e => {
        // A cancel is how stopping works, not a failure.
        if (e.error === 'canceled' || e.error === 'interrupted' || mine !== session) resolve(list.length)
        else if (e.error === 'network' || e.error === 'synthesis-unavailable' || e.error === 'synthesis-failed') resolve(i)
        else reject(new Error(e.error))
      }
      return u
    })
    for (const u of queue) synth.speak(u)
  })

  const reached = await run(voice, parts)
  if (reached >= parts.length || mine !== session) {
    if (mine === session) queue = []
    return
  }

  /* The ranking prefers network voices — Google's, Edge's neural ones — because
     they sound far better, and a network voice needs the network. On a weak
     connection it fails part-way with 'network'. Rather than stop, the rest is
     read by the best voice stored on the device: worse to listen to, and
     better than silence on a train. */
  const local = rankedVoices(all, locale).find(v => v.localService && v !== voice)
  if (!local) throw new Error('network')
  synth.cancel()
  await new Promise(r => setTimeout(r, 60))
  if (mine !== session) return
  const rest = parts.slice(reached)
  const done = await run(local, rest)
  if (done < rest.length && mine === session) throw new Error('synthesis-failed')
  if (mine === session) queue = []
}
