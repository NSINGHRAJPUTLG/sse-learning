'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/query-client';
import ApiTopLoader from '@/components/layout/ApiTopLoader';
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider';

function ThemedToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style:
          theme === 'dark'
            ? { background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }
            : { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' },
      }}
    />
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ApiTopLoader />
        <ThemedToaster />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
