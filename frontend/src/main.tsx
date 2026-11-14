import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// Archivo with its width axis (wdth 62–125%), self-hosted so no third-party requests.
import '@fontsource-variable/archivo/wdth.css';
import './index.css';
import App from './app/App.tsx';
import { GameDataProvider } from './data/GameDataProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameDataProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </GameDataProvider>
  </StrictMode>,
);
