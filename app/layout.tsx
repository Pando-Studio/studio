import './globals.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { cn } from '@/lib/utils';
import { Providers } from './providers';

const gtWalsheim = localFont({
  src: [
    { path: '../public/fonts/GTWalsheimPro-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/GTWalsheimPro-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/GTWalsheimPro-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-walsheim',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Qiplim Studio — Create interactive experiences',
  description:
    'Create interactive experiences from any document. Generate quizzes, presentations, adventures and more — powered by AI.',
  icons: {
    icon: '/favicon.webp',
    apple: '/favicon.webp',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          gtWalsheim.variable,
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
