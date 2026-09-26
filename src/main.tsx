import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'

if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('paham-theme')
    if (stored === 'light') document.documentElement.classList.add('light')
    else document.documentElement.classList.add('dark')
  } catch {
    document.documentElement.classList.add('dark')
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
