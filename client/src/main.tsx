import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { PageActionsProvider } from '@/contexts/PageActionsProvider';
import { ToastProvider } from '@/components/ui';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PageActionsProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PageActionsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
