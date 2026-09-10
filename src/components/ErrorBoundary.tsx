import { Component, type ReactNode } from 'react'

/* The last line between one broken screen and a blank site.
 *
 * React unmounts the whole root when a render throws and nothing catches it, so
 * without this a single bad value on a single page takes the masthead, the
 * navigation and every route with it, and leaves a white page with nothing on
 * it — no message, no way back that is not a reload, and no clue that anything
 * was wrong rather than merely slow.
 *
 * That is not a hypothetical here. `documents` arrived as null on a scheme with
 * no required documents, the Apply screen mapped over it, and a student pressing
 * Apply got white. The null is fixed at its source and in the screen that read
 * it; this exists because the next one will be somewhere else.
 *
 * # Why it matters more in this app than in the panel
 *
 * The admin panel has had a boundary since it had screens. This one did not,
 * and the asymmetry was backwards: an operator meeting a blank panel knows what
 * a bug is, has a colleague to ask and reloads without thinking. The people
 * using this site are students, many using a screen reader or a switch device,
 * often on a borrowed phone — and a blank page announces nothing at all to
 * assistive technology. It is indistinguishable from a page that has not
 * loaded, so the reasonable response is to wait, then leave.
 *
 * Deliberately a class. Error boundaries have no hook equivalent; this is the
 * one place the old API is still the only API.
 *
 * It catches render errors only — not an event handler, not a rejected promise
 * in useQuery. Those already have somewhere to go, which is why the screens
 * report a failed request through ErrorState rather than throwing.
 */

interface Props {
  children: ReactNode
  /* Changing this clears the error, which is how navigating away from a broken
     screen recovers. Without it the fallback sticks to the frame and every page
     the reader visits afterwards shows it instead. */
  resetKey?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error) {
    // Console rather than a reporting service: there is no error pipeline on
    // this site yet, and swallowing it would make the fallback below the only
    // evidence that anything happened at all.
    console.error('page failed to render', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      /* role="alert" so this is announced when it replaces the page. A student
         who cannot see the screen would otherwise be told nothing — which is
         the failure this component exists for, not a detail of it. */
      <div className="page narrow">
        {/* The heading sits outside the notice: `.notice` colours its own text
            with currentColor and only lists p/h2/h3 as exceptions, so an h1
            inside would come out danger-red. */}
        <h1>This page could not be shown</h1>
        <div className="notice danger" role="alert">
          <p>
            Something went wrong while this page was being prepared. Nothing you
            did caused it and nothing you have entered has been lost.
          </p>
          <p>
            Go back and try again, or choose something else from the menu. If it
            keeps happening, tell us and we will fix it.
          </p>
          <p>
            <button className="btn" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          </p>
        </div>
      </div>
    )
  }
}
