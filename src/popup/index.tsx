import React from 'react';
import { createRoot } from 'react-dom/client';
import { ytdLiveChatStoreReadyPromise } from '../stores';
import Popup from './Popup';
ytdLiveChatStoreReadyPromise.then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
  );
});
