/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// Blindagem defensiva leve contra erros de SecurityError ao inspecionar cssRules
// originados de ferramentas externas de captura de tela (ex: html-to-image).
// Nunca mascara erros internos da aplicação.
if (typeof window !== 'undefined') {
  const isExternalCaptureCssRulesError = (msg: unknown): boolean => {
    if (!msg) return false
    const str = String(msg)
    return (
      (str.includes('SecurityError') || str.includes('CSSStyleSheet')) && str.includes('cssRules')
    )
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    const msg = reason?.message || reason
    if (isExternalCaptureCssRulesError(msg)) {
      console.warn(
        '[DefensiveGuard] Ignorando SecurityError externo de cssRules em ferramenta de captura:',
        msg,
      )
      event.preventDefault()
    }
  })

  const prevOnError = window.onerror
  window.onerror = function (message, source, lineno, colno, error) {
    const errorMsg = error?.message || message
    if (isExternalCaptureCssRulesError(errorMsg)) {
      console.warn(
        '[DefensiveGuard] Ignorando SecurityError externo de cssRules capturado por window.onerror:',
        errorMsg,
      )
      return true // Suprime a propagação do erro externo não-fatal
    }
    if (typeof prevOnError === 'function') {
      return prevOnError.apply(this, [message, source, lineno, colno, error])
    }
    return false
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
