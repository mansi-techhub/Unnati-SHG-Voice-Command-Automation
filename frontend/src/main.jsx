import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#fbf8ef', color: '#15201e', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 520, padding: 28, border: '1px solid #e1d8c8', borderRadius: 16, background: '#fff', boxShadow: '0 16px 40px rgba(21, 32, 30, .1)' }}>
            <h1 style={{ marginTop: 0 }}>The app could not load</h1>
            <p>Please refresh the page. If the problem continues, clear the saved session and sign in again.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: '11px 18px', border: 0, borderRadius: 9, color: '#fff', background: '#087f78', fontWeight: 800, cursor: 'pointer' }}>Reload app</button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
