import React from 'react'
import { createRoot } from 'react-dom/client'

import Content from './Content'
import './styles/index.css'
import '../shared/i18n/config'

const contentRoot = document.createElement('div')
contentRoot.id = 'extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'
contentRoot.className = 'extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'
document.body.append(contentRoot)
createRoot(contentRoot).render(
  <React.StrictMode>
    <Content />
  </React.StrictMode>,
)
