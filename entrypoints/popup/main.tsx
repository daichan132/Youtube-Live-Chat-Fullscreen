import React from 'react'
import { createRoot } from 'react-dom/client'

import Popup from './Popup'
import '@/shared/i18n/config'
import '@/shared/styles/theme.css'
import 'uno.css'
import './main.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)
