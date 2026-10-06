import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@finance/ui/tokens.css';
import './styles.css';
import { App } from './App';

const storedTheme = localStorage.getItem('finora-theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.dataset.theme =
  storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : systemTheme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
