/* What Read Aloud reads, and where each sentence is on the page.
 *
 * Read Aloud used to read <main>'s innerText: right words, no idea where they
 * were. Asked for the text to light up yellow as it is spoken (2026-10-05), it
 * needs both, so this walks the visible text and returns each sentence with a
 * DOM Range over it. The panel speaks the sentences and paints the range of the
 * one being spoken with the CSS Custom Highlight API — no element is wrapped,
 * restyled or re-rendered, so React's tree and a screen reader's view of the
 * page are untouched while it reads.
 *
 * Sentence by sentence rather than word by word: word positions come from the
 * engine's boundary events, which Chrome's Google voices — the ones that sound
 * best, and the ones lib/speech prefers — do not send. A highlight that worked
 * only with the worse voices would be a reason to pick a worse voice.
 *
 * What is read is what is seen. Skipped: anything not rendered (the hidden
 * steps of the registration form, a closed menu), anything aria-hidden (icons,
 * the required star, the +91 drawn beside the phone box), text drawn for screen
 * readers only, and scripts and styles.
 */

export interface Segment {
  text: string
  range: Range
}

/* Short enough to finish well inside Chrome's cut-off on its network voices;
   the same limit lib/speech uses for plain text. */
const PIECE = 180

/* Displays that start a new run of text. inline-block and its kin count: a
   button or a chip is its own phrase and must not be read glued to the label
   beside it. */
function startsBlock(display: string) {
  return !(display === 'inline' || display === 'contents')
}

function visible(el: Element): boolean {
  /* .sr-only too: it is drawn as a 1px clip, so its sentence would be spoken
     with a highlight nobody can see — "(not started)" read out while the
     yellow sat on nothing. Read Aloud is for a sighted listener, and reads
     what they can see. */
  if (el.closest('[aria-hidden="true"], .sr-only, script, style, noscript, template, .reading-guide')) return false
  const check = (el as Element & { checkVisibility?: (o?: object) => boolean }).checkVisibility
  return check ? check.call(el, { visibilityProperty: true }) : el.getClientRects().length > 0
}

/* Sentence spans in a run of text, as [start, end) offsets: split on sentence
   ends — the danda (।) as well as the full stop — and anything still too long
   at its last space before the limit. Spans with no letter or digit (a lone
   dash, an arrow) are dropped: there is nothing in them to say. */
function spans(text: string): [number, number][] {
  const out: [number, number][] = []
  const re = /[^.!?।॥]+[.!?।॥]*|[.!?।॥]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    let start = m.index
    let end = m.index + m[0].length
    while (start < end && /\s/.test(text[start])) start++
    while (end > start && /\s/.test(text[end - 1])) end--
    while (end - start > PIECE) {
      const cut = text.lastIndexOf(' ', start + PIECE)
      const at = cut > start + PIECE / 2 ? cut : start + PIECE
      out.push([start, at])
      start = at
      while (start < end && /\s/.test(text[start])) start++
    }
    if (end > start) out.push([start, end])
  }
  return out.filter(([s, e]) => /[\p{L}\p{N}]/u.test(text.slice(s, e)))
}

interface Piece { node: Text; from: number; base: number; length: number }

/** The visible sentences inside `scope`, in reading order. */
export function segments(scope: Range): Segment[] {
  const root = scope.commonAncestorContainer
  const walker = document.createTreeWalker(
    root.nodeType === Node.TEXT_NODE ? root.parentNode ?? root : root,
    NodeFilter.SHOW_TEXT,
  )

  const displays = new Map<Element, string>()
  const display = (el: Element) => {
    let d = displays.get(el)
    if (d === undefined) { d = getComputedStyle(el).display; displays.set(el, d) }
    return d
  }
  const blockOf = (node: Node): Element | null => {
    let el = node.parentElement
    while (el && !startsBlock(display(el))) el = el.parentElement
    return el
  }

  const out: Segment[] = []
  let block: Element | null = null
  let text = ''
  let pieces: Piece[] = []

  const at = (offset: number, isEnd: boolean): [Text, number] => {
    for (const p of pieces) {
      if (offset < p.base + p.length || (isEnd && offset === p.base + p.length)) {
        return [p.node, p.from + Math.max(0, offset - p.base)]
      }
    }
    const last = pieces[pieces.length - 1]
    return [last.node, last.from + last.length]
  }

  const flush = () => {
    if (pieces.length) {
      for (const [s, e] of spans(text)) {
        const range = document.createRange()
        range.setStart(...at(s, false))
        range.setEnd(...at(e, true))
        out.push({ text: text.slice(s, e), range })
      }
    }
    text = ''
    pieces = []
  }

  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text
    if (!scope.intersectsNode(node)) continue
    const parent = node.parentElement
    if (!parent || !visible(parent)) continue

    // Clipped to the scope, so a selection reads from where it starts.
    let from = 0
    let to = node.data.length
    if (node === scope.startContainer) from = scope.startOffset
    if (node === scope.endContainer) to = scope.endOffset
    if (to <= from || !node.data.slice(from, to).trim()) continue

    const b = blockOf(node)
    if (b !== block) { flush(); block = b }
    // A space between adjacent nodes, so "Full name" and "*" never join.
    if (text && !/\s$/.test(text)) text += ' '
    pieces.push({ node, from, base: text.length, length: to - from })
    text += node.data.slice(from, to)
  }
  flush()
  return out
}

/* The highlight itself. Where the browser has no Custom Highlight API, reading
   goes on without it: the voice is the feature, the yellow is the aid. */
const NAME = 'read-aloud'
type Highlights = { set(name: string, h: unknown): void; delete(name: string): void }
const registry = (): Highlights | null =>
  (typeof CSS !== 'undefined' && 'highlights' in CSS ? (CSS as unknown as { highlights: Highlights }).highlights : null)

export function highlight(range: Range | null) {
  const reg = registry()
  if (!reg || typeof Highlight === 'undefined') return
  if (!range) { reg.delete(NAME); return }
  reg.set(NAME, new Highlight(range))

  /* Kept in view, centred, without the smooth scroll a reader who asked for
     less motion would have to sit through. */
  const rect = range.getBoundingClientRect()
  if (rect.top < 80 || rect.bottom > window.innerHeight - 40) {
    const el = range.startContainer.parentElement
    el?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }
}
