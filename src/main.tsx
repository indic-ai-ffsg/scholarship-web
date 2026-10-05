import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { AuthProvider } from './lib/auth'
import { I18nProvider } from './lib/i18n'
import { Announcer } from './components/Announcer'
import { applySavedDisplay } from './lib/display'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

// Before the first render, so a saved text size never flashes the default one.
applySavedDisplay()

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      {/* The boundary the language table suspends on.
          *
          * Only reached on a first visit in one of the thirteen languages that
          * are not compiled into the bundle, and only for as long as a ~10 KB
          * file takes — the request was made while this module was still being
          * evaluated, so most of that wait has already happened by the time
          * React gets here. An English reader never reaches it at all.
          *
          * The fallback is nothing, and has to be: every loading indicator in
          * this product reads its own label through useI18n, and the one thing
          * that is certain inside this boundary is that the language is not
          * ready to be read from. A blank frame in the reader's own language
          * beats a spinner labelled in a language they did not ask for. */}
      <Suspense fallback={null}>
        {/* I18n outermost: the auth provider's error messages and the announcer's
            status text both need a language before anything renders. */}
        <I18nProvider>
          <Announcer>
            <AuthProvider>
              <App />
            </AuthProvider>
          </Announcer>
        </I18nProvider>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
