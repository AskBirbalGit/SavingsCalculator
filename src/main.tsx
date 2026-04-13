import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import OnePager from './OnePager.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OnePager />
  </StrictMode>,
);
