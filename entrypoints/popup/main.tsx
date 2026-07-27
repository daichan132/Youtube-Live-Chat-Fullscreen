import React from 'react'
import { createRoot } from 'react-dom/client'

import { Popup } from './Popup'
import './main.css'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'

const main = async () => {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Popup root was not found')
  const runtime = await createAppRuntime()
  createRoot(rootElement).render(
    <React.StrictMode>
      <AppProvider runtime={runtime}>
        <Popup />
      </AppProvider>
    </React.StrictMode>,
  )
  window.addEventListener('unload', () => runtime.dispose(), { once: true })
}

void main()
