import React from 'react';
import { createRoot } from 'react-dom/client';
import Content from './Content';
import './index.scss';
import { ytdLiveChatStoreReadyPromise } from '../stores';

const contentRoot = document.createElement('div');
contentRoot.id = 'my-extension-root';
contentRoot.style.display = 'contents';
document.body.append(contentRoot);

ytdLiveChatStoreReadyPromise.then(() => {
  createRoot(contentRoot).render(
    <React.StrictMode>
      <Content />
    </React.StrictMode>,
  );
});
