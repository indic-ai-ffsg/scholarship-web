import type { ReactNode } from 'react'

/* The reading half of the listing prose format.
 *
 * A port of admin/src/lib/richtext.tsx, deliberately: the panel writes this
 * dialect into `eligibility_summary`, `important_notes`, `benefit_description`
 * and the rest, and this is the side that shows it to a student. The editor
 * half — the toolbar, the marks it inserts — stays there; only the renderer is
 * needed here, and it is copied rather than shared because the two apps are
 * separate repositories with separate deploys and no package between them.
 *
 * That separation is the whole reason the format is marked-up plain text rather
 * than HTML. The panel's own note says it: store HTML and a student reads
 * `<strong>Full tuition</strong>` on the public site, and something eventually
 * calls dangerouslySetInnerHTML on text an operator typed. Markdown degrades
 * instead — `**Full tuition**` is still a readable sentence to any reader that
 * has not learned the dialect yet, which is exactly what this site was until
 * now, and what it will be again for any field added to the panel before it is
 * added here.
 *
 * The dialect, unchanged from the panel:
 *
 *   **bold**       CommonMark
 *   *italic*       CommonMark
 *   ++underline++  ours — `__` is strong in CommonMark, so it cannot mean this
 *   - bullet       CommonMark
 *   1. numbered    CommonMark
 *   ## / ###       a bigger line, as a heading rather than a point size
 *
 * Hand-written rather than a markdown library, for the reason given there: six
 * marks over operator-typed text, against tens of kilobytes of parser for the
 * ninety per cent of CommonMark this does not offer — on a bundle whose whole
 * point is arriving over a slow connection. It also never builds HTML from a
 * string, which is the property that makes it safe to point at anything.
 *
 * If a mark is added to the panel's editor it has to be added here too. A mark
 * this file does not know is printed as the reader typed it, which is ugly but
 * never wrong — the failure mode is visible, not silent.
 */

/** Splits one line into React nodes on the three inline marks. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  // Bold before italic: `**` would otherwise match as two italics.
  const pattern = /(\*\*[^*]+\*\*|\+\+[^+]+\+\+|\*[^*]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let n = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const piece = match[0]
    const key = `${keyPrefix}-${n++}`

    if (piece.startsWith('**')) out.push(<strong key={key}>{piece.slice(2, -2)}</strong>)
    else if (piece.startsWith('++')) out.push(<u key={key}>{piece.slice(2, -2)}</u>)
    else out.push(<em key={key}>{piece.slice(1, -1)}</em>)

    last = match.index + piece.length
  }

  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Marked-up text as elements. Anything unrecognised stays as it was typed. */
export function renderRichText(text: string): ReactNode {
  const lines = text.split('\n')
  const out: ReactNode[] = []

  /* Consecutive list lines become one list, which is what makes them a list to
     a screen reader rather than a run of paragraphs that happen to start with a
     dash. role="list" on both: WebKit drops the list role when list-style is
     none, and this site's own .plain rule already relies on that being restored
     — see the note on .plain in styles.css. */
  let bullets: string[] = []
  let numbers: string[] = []

  const flush = () => {
    if (bullets.length > 0) {
      out.push(<ul role="list" key={`ul-${out.length}`}>
        {bullets.map((b, i) => <li key={i}>{inline(b, `b${out.length}-${i}`)}</li>)}
      </ul>)
      bullets = []
    }
    if (numbers.length > 0) {
      out.push(<ol key={`ol-${out.length}`}>
        {numbers.map((b, i) => <li key={i}>{inline(b, `n${out.length}-${i}`)}</li>)}
      </ol>)
      numbers = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimStart()

    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) { flushOther('bullet'); bullets.push(bullet[1]); continue }

    const numbered = /^\d+\.\s+(.*)$/.exec(line)
    if (numbered) { flushOther('number'); numbers.push(numbered[1]); continue }

    flush()

    const heading = /^(#{2,3})\s+(.*)$/.exec(line)
    if (heading) {
      /* h4/h5 rather than h2/h3. In the panel that was because the prose sits
         under a section heading owning those levels; here it is the same
         arithmetic one level down — the sheet's sections are h3 — so h4 keeps
         the outline descending. A document whose outline jumps back up is
         harder to navigate than one with no headings at all, and the route
         sweep in scripts/ checks exactly that. */
      const Tag = heading[1].length === 2 ? 'h4' : 'h5'
      out.push(<Tag key={out.length} className="richtext-heading">
        {inline(heading[2], `h${out.length}`)}
      </Tag>)
      continue
    }

    if (line === '') { out.push(<br key={out.length} />); continue }
    out.push(<p key={out.length}>{inline(raw, `p${out.length}`)}</p>)
  }

  flush()
  return out

  // Keeps a bulleted run and a numbered run from merging into one list when
  // they sit against each other with no blank line between.
  function flushOther(kind: 'bullet' | 'number') {
    if (kind === 'bullet' && numbers.length > 0) flush()
    if (kind === 'number' && bullets.length > 0) flush()
  }
}
