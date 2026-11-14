import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
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
