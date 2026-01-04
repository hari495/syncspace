import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

// Import diagnostic tool in development
if (import.meta.env.DEV) {
  import('./debug-auth').then(module => {
    (window as any).diagnoseAuth = module.diagnoseAuth
    console.log('💡 Diagnostic tool loaded. Run diagnoseAuth() to check your setup.')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
