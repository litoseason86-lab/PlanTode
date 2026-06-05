import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppShell from './app/AppShell.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
