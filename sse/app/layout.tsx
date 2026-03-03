import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/providers';

export const metadata: Metadata = {
  title: 'HRM Frontend',
  description: 'HRM management frontend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
