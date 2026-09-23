/* The language control.
 *
 * ---------------------------------------------------------------------------
 * Why it is in the bar and not in the account menu
 * ---------------------------------------------------------------------------
 *
 * The masthead's own note says the occasional account business — the profile,
 * the data rights screen, the colours — belongs behind one labelled control
 * rather than in the row, and lists the language among them. That was right
 * when there was a language toggle and two languages, and it is wrong now, for
 * a reason that only shows up at fourteen:
 *
 * the account menu is labelled "My account", in English, and it is only drawn
 * for somebody who has signed in.
 *
 * Both halves fail the person this control exists for. A visitor who reads only
 * Odia cannot find a control hidden behind an English word, and the moment they
 * most need one is the first screen — before registering, while deciding
 * whether this site is for them at all, which is the public site's whole brief.
 * Every other control in the bar can afford to be found by reading. This is the
 * one that cannot, because not being able to read the page is the condition it
 * treats.
 *
 * So: in the row, on every page, signed in or not, with a globe beside it for
 * the reader who cannot use any of the words.
 *
 * ---------------------------------------------------------------------------
 * Why a <select>
 * ---------------------------------------------------------------------------
 *
 * Fourteen options is past what a row of buttons can hold and past what a
 * hand-built menu can be trusted with. The platform's own control is better
 * than anything here would be: on a phone it opens the full-screen list the
 * reader already knows how to drive, with the system's own text sizing; it is
 * keyboard-operable and type-ahead searchable without a line of script; and
 * assistive technology announces it as a list of fourteen with a position in
 * it, which a <details> of links does not.
 *
 * The cost is that an <option> cannot be styled, which here costs nothing: the
 * only thing an option has to do is spell a language's name in its own script.
 */

import { useId } from 'react'

import { useI18n } from '../lib/i18n-context'
import { LOCALES } from '../lib/locales'
import { IconGlobe } from './icons'

export function LanguageSwitcher() {
  const { t, locale, setLocale } = useI18n()
  const id = useId()

  return (
    <div className="lang-switch">
      <IconGlobe />
      {/* A real <label>, hidden rather than absent.
        *
        * The visible text of this control is the current language's own name —
        * ଓଡ଼ିଆ, தமிழ் — which is exactly the right visible label for a reader
        * looking for their language and no label at all for a screen reader
        * arriving at an unlabelled combobox reading "ଓଡ଼ିଆ". The hidden label
        * supplies the noun; the option supplies the value. WCAG 2.2 1.3.1 and
        * 4.1.2 both want the first, and the visible name satisfies 2.5.3 for
        * the second. */}
      <label className="sr-only" htmlFor={id}>{t('nav.language')}</label>
      <select
        id={id}
        className="lang-select"
        value={locale}
        onChange={event => setLocale(event.target.value)}
      >
        {LOCALES.map(l => (
          /* lang on the option, so a screen reader reads each name with that
           * language's voice instead of attempting தமிழ் in English — which is
           * not an accent, it is noise. dir with it, so the two right-to-left
           * names are not reordered inside a left-to-right list.
           *
           * The accessible name is the native one; the English name is on the
           * title so a sighted reader who does not recognise a script can hover
           * it, and so the option is findable by typing "Tam" on a desktop. */
          <option key={l.code} value={l.code} lang={l.code} dir={l.dir} title={l.english}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  )
}
