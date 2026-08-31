import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { useQuery, usePrefersReducedMotion } from '../lib/hooks'
import { useI18n } from '../lib/i18n-context'
import type { Slide } from '../lib/types'

/* The announcement band on the landing page.
 *
 * What it exists for: everything true only this fortnight. That post-matric
 * applications close on the 30th, that there is a UDID camp in Patna on
 * Saturday, that the helpline is shut over Diwali. None of that can live in
 * compiled copy, and a platform whose operators cannot say it ends up saying it
 * on somebody's personal WhatsApp, where it reaches nobody who needed it. The
 * rows behind this are written in the admin panel; see internal/content.
 *
 * ---------------------------------------------------------------------------
 * A rotating carousel, built carefully, because they are usually built badly
 * ---------------------------------------------------------------------------
 *
 * The band advances every two seconds, and the arrows, the "2 of 3" counter and
 * the visible pause control were removed, both at the operator's instruction.
 * Read the rest of this note before changing either back or further.
 *
 * Auto-advancing content is one of the more reliable ways to make a page
 * unusable for exactly this audience: it moves the thing somebody is halfway
 * through reading, and a reader who needs longer — which includes anyone using
 * a screen magnifier, anyone with a reading disability, and anyone reading
 * their second language — loses the sentence. Two seconds is not enough time to
 * read the lead panel's headline, its sentence and its three claims; it is
 * barely enough to read the headline. WCAG 2.2 SC 2.2.2 asks for a mechanism to
 * pause, stop or hide, and the mechanism it has in mind is a control that says
 * so. What is left after the removal:
 *
 *   pressing any dot stops the rotation for good — this is the stop mechanism
 *     now, and it is not self-evident, which is the compliance gap;
 *   it stops while the pointer is inside the band, so the dots have already
 *     stopped moving by the time a pointer reaches them;
 *   it stops on keyboard focus anywhere inside, before anything is pressed;
 *   it never starts at all when the reader has asked for reduced motion —
 *     that setting is a statement about moving content, not only animation;
 *   it does not run in a background tab, where it would only burn battery.
 *
 * One panel renders as a plain notice with no dots at all: a carousel of one is
 * a control panel for nothing. A failed request shows no error — the landing
 * page's job does not depend on the announcements, and a red box where one
 * should be would be worse than silence.
 *
 * Only the current panel is in the DOM. Hiding the others with CSS leaves their
 * links in the tab order, which is how a keyboard user ends up tabbing into
 * invisible buttons.
 *
 * ---------------------------------------------------------------------------
 * The lead panel
 * ---------------------------------------------------------------------------
 *
 * The first panel is compiled into the app rather than read from the database,
 * and is always there. It is the site's proposition — what this is and what it
 * costs — which is the one thing on the page that must not depend on an
 * operator having remembered to write it, must not expire, and must survive the
 * API being down. Everything after it is an announcement, written in the admin
 * panel, and rotates behind it in the order the operators chose.
 *
 * That also means the band is no longer sometimes absent: with nothing
 * published, and with the request failing, the reader still gets the lead
 * panel and no controls.
 */

/* The lead panel's headline as one plain string.
 *
 * The headline is drawn in three coloured pieces, and anywhere that needs the
 * phrase as text — the dot that jumps to this panel — rebuilds it from those
 * same three rather than holding a fourth copy that could drift out of step.
 * Concatenating fragments is normally a localisation mistake; it is safe here
 * because the fragments are one phrase split for colour and the join is the
 * exact inverse of the split. A language that would not reassemble in this order
 * needs a whole string of its own, and this is where it would go. */
function leadName(t: (key: string) => string) {
  return `${t('slides.lead.was')}${t('slides.lead.able')} ${t('slides.lead.dist')}`
}

/* How long each panel holds, when it is rotating at all.
 *
 * Two seconds, as asked. It was eight, which the note above argues is already
 * short. Nothing else in this file depends on the number — the lead panel's
 * entrance is a shade over a second and plays once — so this is the one line to
 * change if the reading time is ever revisited. */
const DWELL_MS = 2000

export default function Slides() {
  const { t } = useI18n()
  const reducedMotion = usePrefersReducedMotion()

  const query = useQuery<Slide[]>(
    signal => api.get('/public/slides', undefined, signal),
    [],
  )

  /* The lead panel, then whatever the operators published. `null` is the lead
   * panel rather than a separate flag: the list is what the arrows, the counter
   * and the rotation all index into, and one list is what keeps them agreeing
   * about how many panels there are. */
  const panels: (Slide | null)[] = [null, ...(query.data ?? [])]

  const [index, setIndex] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [hovered, setHovered] = useState(false)
  /* Whether the band has ever moved off the panel it started on. Only the lead
   * panel's entrance reads it; see the note where `reveal` is derived. */
  const [moved, setMoved] = useState(false)

  // Rotation is off entirely for a lone panel, for a reader who asked for
  // reduced motion, and while the pointer or the keyboard is inside the band.
  const rotating = panels.length > 1 && !stopped && !reducedMotion && !hovered

  useEffect(() => {
    if (!rotating) return

    const timer = setInterval(() => {
      // A background tab has no reader to advance for.
      if (document.hidden) return
      setMoved(true)
      setIndex(i => (i + 1) % panels.length)
    }, DWELL_MS)

    return () => clearInterval(timer)
  }, [rotating, panels.length])

  // A slide removed in the admin panel while somebody sits on the page would
  // otherwise leave the index past the end of the list.
  const position = Math.min(index, panels.length - 1)
  const current = panels[position]

  const single = panels.length === 1

  /* The lead panel's entrance plays once.
   *
   * Rotating away and back mounts a new article, so without this the whole
   * reveal — the branches drawing, the cards arriving — would replay every time
   * the band came round again. A one-off flourish on arrival is a flourish; the
   * same flourish every twenty-four seconds is decorative motion on a timer,
   * which is the thing this component exists not to do.
   *
   * The flag is set where the index moves — by the timer or by the arrows — and
   * not in an effect watching which panel is current. Flipping it while the lead
   * panel is on screen would re-render and strip the class out from under an
   * animation half-played; waiting for the animation to finish instead would
   * mean this file knowing how long the stylesheet takes. Moving off the panel
   * is the moment, and both movers already have a line here. */
  const reveal = !current && !moved

  function go(next: number) {
    setMoved(true)
    setIndex((next + panels.length) % panels.length)
    // Moving by hand is a statement that this reader is steering. Rotating
    // afterwards would take the page back off them a few seconds later.
    setStopped(true)
  }

  return (
    <section
      /* The lead panel gets the band a ground of its own: it is the top of the
         page and the site's proposition, and a hero set in the same white as
         the section under it is not a hero. */
      className={current ? 'slides' : 'slides slides-lead'}
      aria-roledescription="carousel"
      aria-label={t('slides.label')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // React's onFocus/onBlur bubble, so these fire for anything inside —
      // which is the point: a keyboard user reading the link should not have
      // the slide change under them.
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* The live region is the wrapper, which persists, rather than the slide,
          which is replaced. Polite only while the band is not rotating: a region
          that announces every eight seconds on its own is not politeness, it is
          an interruption on a timer. */}
      <div className="slide-region" aria-live={rotating ? 'off' : 'polite'}>
        <article
          className={
            current ? 'slide' : `slide slide-lead${reveal ? ' slide-lead-reveal' : ''}`
          }
          // Keyed so a changed panel is a new element: the fade below is what
          // tells a sighted reader the content moved rather than the words
          // silently swapping in place.
          key={current?.slide_id ?? 'lead'}
          aria-roledescription="slide"
          aria-label={single
            ? undefined
            : t('slides.position', { n: position + 1, total: panels.length })}
        >
          {current ? <Announcement slide={current} /> : <Lead />}
        </article>
      </div>

      {/* After the panel, not before it: this is where a row of dots is looked
          for, and the objection to putting controls below content — that they
          sit at a different height for every panel — is answered twice over
          here. The region below has a floor under it so short panels do not
          pull the dots up, and the band stops rotating the moment a pointer
          enters it, so they have stopped moving before one arrives. */}
      {!single && (
        <div className="slides-dots">
          {panels.map((p, i) => (
            <button
              key={p?.slide_id ?? 'lead'}
              type="button"
              className={i === position ? 'dot on' : 'dot'}
              /* Named by the panel it goes to. "Slide 2 of 3" tells somebody
                 using a screen reader where they would land in the list and
                 nothing about what is there; the headline tells them whether
                 they want to go.

                 The lead panel's name is assembled from the same three strings
                 the headline is drawn from, rather than kept as a fourth copy of
                 the phrase that could drift out of step with them. */
              aria-label={t('slides.goto', { name: p ? p.headline_en : leadName(t) })}
              aria-current={i === position ? 'true' : undefined}
              onClick={() => go(i)}
            >
              {/* The drawn dot is small; the button around it is not. */}
              <span className="dot-mark" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/* The lead panel: what the site is, and what it costs.
 *
 * A heading at h2, not h1. The page's h1 is the hero below this band, and it
 * stays there: this panel is one of several the band rotates through, and a
 * carousel whose first panel outranks the page and whose others do not is not a
 * document outline anybody can navigate. The consequence — a reader tabbing by
 * heading meets this h2 before the h1 under it — is the price of putting the
 * band above the page title, and the band's own accessible name ("Announcements")
 * is what tells them where they are.
 *
 * The three claims are a list, so a screen reader says "3 items" rather than
 * running them into one sentence. The ticks are decorative: the list already
 * says these are things the site does, and "tick, completely free" read aloud
 * three times is noise. */
function Lead() {
  const { t } = useI18n()

  return (
    <div className="lead">
      <div className="lead-main">
        {/* The headline is the argument, not a label for it.
          *
          * "Dis-" struck out in grey, "Ability to" in blue, "Distinction" in
          * green on its own line. Read as a sequence it does the thing the words
          * only describe: strike the limitation, what is left is the ability,
          * and what the ability leads to is the distinction. Grey, then blue,
          * then green — old perception, capability, outcome.
          *
          * Three points about how it is built:
          *
          * The strike is CSS on a plain <span>, not <s> or <del>. Those two
          * carry meaning some screen readers announce ("deleted, Dis"), and the
          * strike here is a visual argument rather than an edit to a document.
          * The heading's text is untouched, so it is still announced as
          * "Dis-Ability to Distinction" — the phrase, in full, as written.
          *
          * The hyphen goes inside the struck span. Striking "Dis" alone leaves a
          * dash hanging in front of "Ability"; striking "Dis-" leaves exactly
          * "Ability to Distinction", which is the sentence the design is making.
          *
          * The {' '} is load-bearing. Both halves are display:block, and without
          * a real space in the markup the accessible name concatenates to
          * "Dis-Ability toDistinction". */}
        <h2 className="lead-headline">
          <span className="hl-line">
            <span className="hl-was">{t('slides.lead.was')}</span>
            <span className="hl-able">{t('slides.lead.able')}</span>
          </span>{' '}
          <span className="hl-dist">{t('slides.lead.dist')}</span>
        </h2>

        <p className="lead-lede">{t('slides.lead.body')}</p>

        <ul role="list" className="lead-points">
          {[t('slides.lead.free'), t('slides.lead.languages'), t('slides.lead.support')].map(point => (
            <li key={point}>
              <span className="tick" aria-hidden="true">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <Illustration />
    </div>
  )
}

/* One announcement, as an operator wrote it. */
function Announcement({ slide }: { slide: Slide }) {
  const { t } = useI18n()

  /* The English fields only.
   *
   * The API still sends a Hindi headline, body, button label and picture
   * description for every slide — those columns belong to the operators who
   * write them, and the admin panel still offers them — and this app no longer
   * has a language to show them in. */
  const linkLabel = slide.link_label_en

  /* Words on the reading side, picture beside them — the same shape as the lead
   * panel, and for the same two reasons now that the band is the full width of
   * the window.
   *
   * The picture used to sit above the words, full width. In a 1265px band that
   * turned a portrait notice into a letterboxed strip with a grey field either
   * side of it; and stacked, a notice carrying one stood 512px against the lead
   * panel's 243px, so the whole page below the band moved by 269px twice every
   * cycle. Beside the words it is the height of the words, and nothing moves. */
  return (
    <div className="slide-notice">
      <div className="slide-notice-main">
        <h2>{slide.headline_en}</h2>
        {slide.body_en && <p>{slide.body_en}</p>}

        <div className="row">
          {slide.link_url && linkLabel && (
            <SlideLink url={slide.link_url} label={linkLabel} />
          )}

          {/* The video is somebody else's page, so it is a secondary button
              and says out loud that it leaves the site. */}
          {slide.video_url && (
            <a className="btn" href={slide.video_url} rel="noreferrer">
              {t('slides.watch')}
              <span className="sr-only"> — {t('slides.external')}</span>
            </a>
          )}
        </div>
      </div>

      {slide.image_url && (
        /* width and height are the intrinsic pixels, and the stylesheet
           sets height:auto — which is what makes the browser hold the right
           amount of space before the file arrives. Without them the band
           grows as the picture loads and pushes the page down under the
           reader's finger, on exactly the slow connection where it hurts.

           No lazy loading: this is at the top of the page, and deferring it
           only means the shift happens later. */
        <img
          className="slide-image"
          src={slide.image_url}
          alt={slide.image_alt_en ?? ''}
          width={slide.image_width}
          height={slide.image_height}
          decoding="async"
        />
      )}
    </div>
  )
}

/* One button, and it may point off the site.
 *
 * An internal path goes through the router, so it does not reload the app. An
 * external address is a plain anchor, stays in the same tab — a new window is
 * disorienting and hard to get back from on a phone — and says so out loud
 * before it is followed, because a link that leaves the site without warning is
 * how somebody ends up typing their name into a page they did not choose.
 *
 * The address itself was checked when it was saved: a path or an https URL and
 * nothing else. This is the second half of that, at the point of rendering. */
function SlideLink({ url, label }: { url: string; label: string }) {
  const { t } = useI18n()
  const internal = url.startsWith('/') && !url.startsWith('//')

  if (internal) {
    return <Link className="btn primary" to={url}>{label}</Link>
  }

  if (!url.startsWith('https://')) return null

  return (
    <a className="btn primary" href={url} rel="noreferrer">
      {label}
      <span className="sr-only"> — {t('slides.external')}</span>
    </a>
  )
}

/* The illustration beside the lead panel.
 *
 * Inline rather than a file: it is drawn from the same few flat colours as the
 * rest of the page, so it compresses to about a kilobyte and a half in the
 * bundle and costs no request at all — which is the only reason there is a
 * picture on this page. A photograph of a smiling student would be a hundred
 * times the size and would tell the reader nothing.
 *
 * Hidden from assistive technology, and deliberately. It carries no information
 * the words beside it do not: a screen reader that stopped to describe a drawing
 * of a tree on the way to "Completely free" would be reading out the decoration
 * and delaying the point. This is the same call as the empty alt on an
 * announcement picture an operator did not describe.
 *
 * The palette is the artwork's own, in literal hex rather than tokens. These are
 * not UI colours — nothing here is a border, a state or a control — and the
 * greens and ambers have no token to be. It is a light-ground drawing on a
 * light-ground page; there is no theme for it to follow.
 */
function Illustration() {
  return (
    <svg
      className="lead-art"
      viewBox="0 0 400 380"
      aria-hidden="true"
      focusable="false"
    >
      {/* The trunk, and the branches: three heavy ones to the cap and the two
          upper cards, three lighter ones to the four cards below. */}
      <rect x="185" y="280" width="30" height="80" rx="4" fill="#bde0cb" />
      <path d="M200 280 C200 240 140 220 100 180" stroke="#4f9f75" strokeWidth="3" fill="none" strokeLinecap="round" className="art-branch" pathLength={1} />
      <path d="M200 280 C200 230 200 200 200 140" stroke="#12523a" strokeWidth="3.5" fill="none" strokeLinecap="round" className="art-branch" pathLength={1} />
      <path d="M200 280 C200 240 260 220 300 180" stroke="#4f9f75" strokeWidth="3" fill="none" strokeLinecap="round" className="art-branch" pathLength={1} />
      <path d="M200 240 C210 220 240 210 270 230" stroke="#8ac5a3" strokeWidth="2.5" fill="none" strokeLinecap="round" className="art-branch" pathLength={1} />
      <path d="M200 240 C190 220 160 210 130 230" stroke="#8ac5a3" strokeWidth="2.5" fill="none" strokeLinecap="round" className="art-branch" pathLength={1} />
      <path d="M200 200 C220 180 250 150 280 120" stroke="#4f9f75" strokeWidth="2.5" fill="none" strokeLinecap="round" className="art-branch" pathLength={1} />
      <path d="M200 200 C180 180 150 150 120 120" stroke="#4f9f75" strokeWidth="2.5" fill="none" strokeLinecap="round" className="art-branch" pathLength={1} />

      {/* A joint where each branch meets what it carries, so a card reads as
          growing out of the tree rather than floating over it. */}
      <circle cx="200" cy="140" r="6" fill="#12523a" />
      <circle cx="100" cy="180" r="5" fill="#4f9f75" />
      <circle cx="300" cy="180" r="5" fill="#4f9f75" />
      <circle cx="270" cy="230" r="4" fill="#8ac5a3" />
      <circle cx="130" cy="230" r="4" fill="#8ac5a3" />
      <circle cx="280" cy="120" r="4.5" fill="#4f9f75" />
      <circle cx="120" cy="120" r="4.5" fill="#4f9f75" />

      {/* The cap at the top of the trunk: where the six cards lead. */}
      <g transform="translate(200,108)">
        <circle r="30" fill="#dcf0e4" />
        <polygon points="0,-18 28,-4 28,10 -28,10 -28,-4" fill="#12523a" />
        <rect x="-14" y="2" width="28" height="14" rx="3" fill="#0a3322" />
        <line x1="28" y1="-4" x2="32" y2="8" stroke="#f0a11a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="12" r="3.5" fill="#f0a11a" />
      </g>

      {/* Six scholarship cards, largest nearest the eye. Each is the same
          shape the directory renders: a mark, a title rule and a line under it. */}
      <g transform="translate(82,160)">
        <rect x="-36" y="-20" width="72" height="40" rx="10" fill="#fff" stroke="#e2e8e4" strokeWidth="1.5" />
        <circle cx="-14" cy="0" r="10" fill="#e2f5ec" />
        <text x="-14" y="4" fontSize="13" fontWeight="700" fill="#22a86b" textAnchor="middle" fontFamily="system-ui">₹</text>
        <rect x="2" y="-7" width="22" height="5" rx="2.5" fill="#cbe4d5" />
        <rect x="2" y="2" width="16" height="4" rx="2" fill="#e9f3ed" />
      </g>
      <g transform="translate(318,160)">
        <rect x="-36" y="-20" width="72" height="40" rx="10" fill="#fff" stroke="#e2e8e4" strokeWidth="1.5" />
        <circle cx="-14" cy="0" r="10" fill="#dcf0e4" />
        <rect x="2" y="-7" width="22" height="5" rx="2.5" fill="#cbe4d5" />
        <rect x="2" y="2" width="16" height="4" rx="2" fill="#e9f3ed" />
        <circle cx="-14" cy="0" r="4" fill="#12523a" />
      </g>
      <g transform="translate(115,100)">
        <rect x="-32" y="-16" width="64" height="32" rx="8" fill="#fff" stroke="#e2e8e4" strokeWidth="1.5" />
        <circle cx="-12" cy="0" r="8" fill="#fce4b8" />
        <text x="-12" y="4" fontSize="10" fontWeight="700" fill="#a06b00" textAnchor="middle" fontFamily="system-ui">G</text>
        <rect x="2" y="-5" width="18" height="4" rx="2" fill="#cbe4d5" />
        <rect x="2" y="2" width="14" height="3" rx="1.5" fill="#e9f3ed" />
      </g>
      <g transform="translate(285,100)">
        <rect x="-32" y="-16" width="64" height="32" rx="8" fill="#fff" stroke="#e2e8e4" strokeWidth="1.5" />
        <circle cx="-12" cy="0" r="8" fill="#22a86b" />
        <path d="M-15 0l2 2 5-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <rect x="2" y="-5" width="18" height="4" rx="2" fill="#cbe4d5" />
        <rect x="2" y="2" width="14" height="3" rx="1.5" fill="#e9f3ed" />
      </g>
      <g transform="translate(260,218)">
        <rect x="-28" y="-14" width="56" height="28" rx="8" fill="#fff" stroke="#e2e8e4" strokeWidth="1.5" />
        <circle cx="-10" cy="0" r="7" fill="#f0d5e4" />
        <text x="-10" y="3" fontSize="9" fontWeight="700" fill="#993556" textAnchor="middle" fontFamily="system-ui">P</text>
        <rect x="2" y="-4" width="16" height="3" rx="1.5" fill="#cbe4d5" />
        <rect x="2" y="2" width="12" height="3" rx="1.5" fill="#e9f3ed" />
      </g>
      <g transform="translate(140,218)">
        <rect x="-28" y="-14" width="56" height="28" rx="8" fill="#fff" stroke="#e2e8e4" strokeWidth="1.5" />
        <circle cx="-10" cy="0" r="7" fill="#dcf0e4" />
        <text x="-10" y="3" fontSize="9" fontWeight="700" fill="#12523a" textAnchor="middle" fontFamily="system-ui">S</text>
        <rect x="2" y="-4" width="16" height="3" rx="1.5" fill="#cbe4d5" />
        <rect x="2" y="2" width="12" height="3" rx="1.5" fill="#e9f3ed" />
      </g>

      {/* Three sparks and the ground shadow. Static — nothing in this drawing
          moves, so there is nothing for reduced motion to switch off. */}
      <path d="M 340 50 l 4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill="#22a86b" opacity=".5" />
      <path d="M 60 70 l 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#f0a11a" opacity=".5" />
      <path d="M 350 260 l 2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" fill="#8ac5a3" opacity=".5" />
      <ellipse cx="200" cy="358" rx="60" ry="8" fill="#dcf0e4" opacity=".6" />
    </svg>
  )
}
