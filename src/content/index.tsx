import React from 'react'
import { createRoot } from 'react-dom/client'

import { Content } from './Content'
import './styles/index.css'
import '@/shared/i18n/config'

const contentRoot = document.createElement('div')
document.body.append(contentRoot)
createRoot(contentRoot).render(
  <React.StrictMode>
    <Content />
  </React.StrictMode>,
)
