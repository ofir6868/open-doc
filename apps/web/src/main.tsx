import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider } from '@fluentui/react-components';
// Self-hosted fonts — bundled by Vite so the app works fully offline.
import '@fontsource-variable/fraunces';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import App from './App';
import { openDocTheme } from './theme';
import './index.css';
import { Toaster } from 'sonner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <FluentProvider theme={openDocTheme} className="od-provider">
    <App />
    <Toaster richColors position="bottom-right" />
  </FluentProvider>,
);
