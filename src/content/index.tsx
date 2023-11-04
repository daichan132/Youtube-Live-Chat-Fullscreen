import 'webextension-polyfill';
import 'construct-style-sheets-polyfill';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Content from './Content';
import { emojiFixStoreReadyPromise } from '../shared/emojiFixStore';
import { setupTailwind } from './setupTailwind';

const contentRoot = document.createElement('div');
contentRoot.id = 'my-extension-root';
contentRoot.style.display = 'contents';
document.body.append(contentRoot);

const shadowRoot = contentRoot.attachShadow({ mode: 'open' });
setupTailwind(shadowRoot);

const shadowWrapper = document.createElement('div');
shadowWrapper.id = 'root';
shadowWrapper.style.display = 'contents';
shadowRoot.appendChild(shadowWrapper);

emojiFixStoreReadyPromise.then(() =>
  createRoot(shadowWrapper).render(
    <React.StrictMode>
      <Content />
    </React.StrictMode>
  )
);
