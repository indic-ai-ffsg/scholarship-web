/* A page title a route cannot know.
 *
 * Layout titles the tab from the path, which is right for every page whose name
 * is fixed — "My documents", "Impact". It cannot be right for the four whose
 * name is the thing they are showing: a scheme, an application, the scheme an
 * application is for, and a page written in the admin panel. All four took the
 * title of the list they came from, so a reader with three schemes open in three
 * tabs had three tabs reading "Scholarships", and a screen reader announced the
 * same words on arriving at each. That is 2.4.2, and it is worst exactly where
 * the reader most needs telling apart.
 *
 * The value is held by Layout rather than written here directly, because Layout
 * writes document.title too and React runs a child's effect before its parent's
 * — so a title set here would be overwritten a moment later by the route
 * default. Setting state instead makes the parent the only writer, and lets it
 * clear the override on navigation so a page without one cannot inherit the
 * last page's name.
 *
 * Pass null or '' while the data is still loading and the route default stands.
 */
import { createContext, useContext, useEffect } from 'react'

export const PageTitleContext = createContext<(title: string | null) => void>(() => {})

export function usePageTitle(title: string | null | undefined) {
  const set = useContext(PageTitleContext)
  useEffect(() => {
    if (!title) return
    set(title)
    /* Cleared on the way out as well as on navigation: a page unmounting for
       any other reason must not leave its name on the tab. */
    return () => set(null)
  }, [title, set])
}
