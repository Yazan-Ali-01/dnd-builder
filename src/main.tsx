import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BuilderProvider } from './state/BuilderProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BuilderProvider>
      <App />
    </BuilderProvider>
  </StrictMode>,
);
