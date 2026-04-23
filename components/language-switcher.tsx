'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={cn('flex items-center gap-1 text-xs font-display font-semibold text-muted-foreground', className)}>
      <button
        type="button"
        onClick={() => router.replace(pathname, { locale: 'en' })}
        className={cn(
          'px-1.5 py-0.5 rounded transition-colors',
          locale === 'en' ? 'text-foreground font-bold' : 'hover:text-foreground',
        )}
      >
        EN
      </button>
      <span className="text-border">/</span>
      <button
        type="button"
        onClick={() => router.replace(pathname, { locale: 'fr' })}
        className={cn(
          'px-1.5 py-0.5 rounded transition-colors',
          locale === 'fr' ? 'text-foreground font-bold' : 'hover:text-foreground',
        )}
      >
        FR
      </button>
    </div>
  );
}
