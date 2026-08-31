/* Where the foundation is, elsewhere.
 *
 * ---------------------------------------------------------------------------
 * The addresses go here, and this is the only file that needs editing
 * ---------------------------------------------------------------------------
 *
 * Paste each account's address into its `url` below. That is the whole job.
 *
 * They are blank rather than guessed. "linkedin.com/company/indic-ai" is a
 * plausible address and a coin flip; if it is wrong it points a student at
 * somebody else's page, possibly at somebody squatting the name — and this
 * audience has been warned about impersonation more than most.
 *
 * A mark with no address is still shown, as a picture rather than a link: the
 * footer then says "we are on Facebook" without pretending to be pressable, and
 * it starts working the moment an address lands here.
 *
 * ---------------------------------------------------------------------------
 * Why the files are imported rather than named by path
 * ---------------------------------------------------------------------------
 *
 * They live in web/asset/, which is not web/public/ — and only the latter is
 * served as-is. A src="/asset/social/facebook.svg" therefore 404s in
 * development and is not copied into the build at all, which is exactly why the
 * icons were not showing. Imported, the bundler resolves each file, fingerprints
 * it for caching and emits it; the files stay where they were put.
 */

import facebook from '../../asset/social/facebook.svg'
import instagram from '../../asset/social/instagram.svg'
import youtube from '../../asset/social/yt.svg'
import linkedin from '../../asset/social/linkedin.svg'

export interface Account {
  /** The platform's name, used as the link's accessible name. */
  name: string
  /** The foundation's page there. Blank means the mark shows but does not link. */
  url: string
  /** The mark, as resolved by the bundler. */
  icon: string
}

export const SOCIAL: Account[] = [
  { name: 'Facebook', url: '', icon: facebook },
  { name: 'Instagram', url: '', icon: instagram },
  { name: 'YouTube', url: '', icon: youtube },
  { name: 'LinkedIn', url: '', icon: linkedin },
]
