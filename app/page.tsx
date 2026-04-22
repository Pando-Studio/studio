import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';

/**
 * Root page — redirects to the default locale landing page.
 * The next-intl middleware normally handles this, but this serves
 * as a fallback in case the middleware is bypassed.
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
