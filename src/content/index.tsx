import React from 'react';
import { createRoot } from 'react-dom/client';
import Content from './Content';
import { BrowserRouter } from 'react-router-dom';

const contentRoot = document.createElement('div');
contentRoot.id = 'my-extension-root';
contentRoot.style.display = 'contents';
document.body.append(contentRoot);

createRoot(contentRoot).render(
  <React.StrictMode>
    <BrowserRouter>
      <Content />
    </BrowserRouter>
  </React.StrictMode>,
);
