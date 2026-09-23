/* The matched list's glyphs.
 *
 * Inline SVG, not an icon font and not a package. The site is served under a
 * strict content policy and every request that can fail is a row of empty boxes
 * where the meaning was; these cost nothing and cannot 404. It is also why
 * lucide-react is not a dependency for six shapes.
 *
 * Drawn on a 24-unit grid with a 1.7 stroke and no fill, so they sit at the
 * weight of the text beside them. `currentColor` throughout, which is what lets
 * a deadline row go red without a second rule.
 *
 * Every one of these sits beside its own text label, so they are decorative:
 * a screen reader announcing them would read the same thing twice.
 */

type IconProps = { className?: string }

function Svg({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** A calendar: when it closes. */
export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
  </Svg>
)

/** A sheet: how an application is made. */
export const IconForm = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h7l5 5v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M13 3v5h5" />
    <path d="M8.5 13.5h7M8.5 17h4.5" />
  </Svg>
)

/** A colonnade: the body running the scheme. */
export const IconProvider = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5 12 4l9 5.5" />
    <path d="M5.5 10.5v7M10 10.5v7M14 10.5v7M18.5 10.5v7" />
    <path d="M3.5 20.5h17" />
  </Svg>
)

/** A rupee in a ring: what the award is. */
export const IconAward = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 8h6M9 11h6M13.5 8c1.4 0 2 .9 2 1.6 0 1-.8 1.6-2.2 1.6H9l4.5 4.8" />
  </Svg>
)

/** A tick in a ring: this one is open to you. */
export const IconYes = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.2l2.8 2.8L16 9.5" />
  </Svg>
)

/** A cross in a ring: a rule refused. */
export const IconNo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </Svg>
)

/** A bulb: the profile nudge. */
export const IconIdea = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z" />
  </Svg>
)

/** A globe: which language the page is in.
 *
 * Beside the language switcher's control, which already shows the current
 * language's own name — so decorative like the rest, and doing the one job an
 * icon can do that a word cannot: it is recognisable to somebody who cannot
 * read any of the words around it. That is the reader this control exists for. */
export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
  </Svg>
)

/** A handset: the number a code goes to, and the call that reads one out. */
export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </Svg>
)

/** A shield with a tick: the code that proves the number is yours. */
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6l-7-3z" />
    <path d="M9 12l2.2 2.2L15.5 10" />
  </Svg>
)

/** A text message: the code by SMS. */
export const IconMessage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    <path d="M7.5 9.5h9M7.5 12.5h6" />
  </Svg>
)

/** A round chat bubble: the code on WhatsApp. Drawn generic rather than as
 * WhatsApp's own mark, which is theirs to draw, and the button's words name
 * the service anyway. */
export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z" />
    <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
  </Svg>
)

/** A handset receiver: the code read out in a call. */
export const IconCall = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.6 3.5h2.6l1.3 4.1-2 1.4a11 11 0 0 0 6.5 6.5l1.4-2 4.1 1.3v2.6a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.6 5.5a2 2 0 0 1 2-2z" />
  </Svg>
)

/** A pencil: change what is written beside it. */
export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5z" />
    <path d="M12.5 7.5l4 4" />
  </Svg>
)

/** A mortarboard: education — what a student is studying, and where. */
export const IconGraduate = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5z" />
    <path d="M6.5 11.5v4.2c0 .9 2.5 2.3 5.5 2.3s5.5-1.4 5.5-2.3v-4.2" />
    <path d="M21.5 9.5v5" />
  </Svg>
)

/** A head and shoulders: the student's own profile. */
export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.2-3.8 4.2-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
  </Svg>
)

/** A door with an arrow leaving it: signing out. */
export const IconSignOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14" />
    <path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" />
  </Svg>
)
