import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { AuthProvider } from './lib/auth'
import { I18nProvider } from './lib/i18n'
import { Announcer } from './components/Announcer'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      {/* I18n outermost: the auth provider's error messages and the announcer's
          status text both need a language before anything renders. */}
      <I18nProvider>
        <Announcer>
          <AuthProvider>
            <App />
          </AuthProvider>
        </Announcer>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
