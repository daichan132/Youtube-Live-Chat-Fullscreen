import 'webextension-polyfill';
import 'construct-style-sheets-polyfill';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Content from './Content';
import { emojiFixStoreReadyPromise } from '../shared/emojiFixStore';

const contentRoot = document.createElement('div');
contentRoot.id = 'my-extension-root';
contentRoot.style.display = 'contents';
document.body.append(contentRoot);

emojiFixStoreReadyPromise.then(() =>
  createRoot(contentRoot).render(
    <React.StrictMode>
      <Content />
    </React.StrictMode>
  )
);
