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
  title: 'Qiplim Studio — Any document to any learning content',
  description:
    'Open source AI platform that transforms documents into interactive learning content: quizzes, summaries, flashcards, podcasts, videos, presentations, and more. Self-hostable, multi-provider (Mistral, OpenAI, Anthropic, Google).',
  icons: {
    icon: '/favicon.webp',
    apple: '/favicon.webp',
  },
  openGraph: {
    title: 'Qiplim Studio — Any document to any learning content',
    description:
      'Open source AI platform that transforms documents into interactive learning content: quizzes, summaries, flashcards, podcasts, videos, presentations, and more.',
    siteName: 'Qiplim Studio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qiplim Studio — Any document to any learning content',
    description:
      'Open source AI platform that transforms documents into interactive learning content. Self-hostable, multi-provider.',
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
