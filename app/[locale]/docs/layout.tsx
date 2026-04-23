'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Blocks,
  Code2,
  Server,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

interface NavItem {
  labelKey: string;
  href: '/docs/getting-started' | '/docs/widget-types' | '/docs/api' | '/docs/self-hosting';
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { labelKey: 'gettingStarted', href: '/docs/getting-started', icon: <BookOpen className="h-4 w-4" /> },
  { labelKey: 'widgetTypes', href: '/docs/widget-types', icon: <Blocks className="h-4 w-4" /> },
  { labelKey: 'api', href: '/docs/api', icon: <Code2 className="h-4 w-4" /> },
  { labelKey: 'selfHosting', href: '/docs/self-hosting', icon: <Server className="h-4 w-4" /> },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations('docs');

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Logo size="sm" href="/" />
            <span className="text-sm text-muted-foreground">/ {t('documentation')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">{t('backToHome')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed md:sticky top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border/40 bg-background p-4 transition-transform md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="space-y-1">
            <Link
              href="/docs"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                pathname === '/docs'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <BookOpen className="h-4 w-4" />
              {t('overview')}
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {t(item.labelKey)}
                {pathname === item.href && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 p-8 md:p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
