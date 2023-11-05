import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import { emojiFixStoreReadyPromise } from '../shared/emojiFixStore';

emojiFixStoreReadyPromise.then(() =>
  createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  )
);
