import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SmoothScrollProvider from '@/app/providers/SmoothScrollProvider';
import '@/styles/index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <StrictMode>
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-btn focus:bg-aubergine focus:px-4 focus:py-2 focus:text-canvas"
    >
      Skip to content
    </a>
    <SmoothScrollProvider>
      <App />
    </SmoothScrollProvider>
  </StrictMode>
);
