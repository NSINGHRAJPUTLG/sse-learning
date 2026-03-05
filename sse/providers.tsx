'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/query-client';
import ApiTopLoader from '@/components/layout/ApiTopLoader';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiTopLoader />
      <Toaster position="top-right" />
      {children}
    </QueryClientProvider>
  );
}
