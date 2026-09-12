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
