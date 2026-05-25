import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PageActionsProvider } from '@/contexts/PageActionsContext';
import { ToastProvider } from '@/components/ui';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PageActionsProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </PageActionsProvider>
    </ThemeProvider>
  </React.StrictMode>
);
