'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Menu, X, ChevronDown, Github, ArrowRight } from 'lucide-react';

export function PublicHeader() {
  const t = useTranslations('publicNav');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/95 backdrop-blur-md border-b border-landing-border">
      <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display font-bold text-lg">
          Qiplim <span className="text-yellow-500">Studio</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {/* Product dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-landing-text transition-colors">
              {t('product')} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="absolute hidden group-hover:block top-full left-0 pt-2">
              <div className="bg-white border rounded-lg shadow-lg p-2 min-w-[200px]">
                <Link
                  href="/education"
                  className="block px-3 py-2 text-sm text-muted-foreground hover:text-landing-text hover:bg-muted rounded-md transition-colors"
                >
                  {t('useCases')}
                </Link>
                <Link
                  href="/on-premise"
                  className="block px-3 py-2 text-sm text-muted-foreground hover:text-landing-text hover:bg-muted rounded-md transition-colors"
                >
                  {t('onPremise')}
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/developers"
            className="text-sm font-medium text-muted-foreground hover:text-landing-text transition-colors"
          >
            {t('developers')}
          </Link>

          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground hover:text-landing-text transition-colors"
          >
            {t('pricing')}
          </Link>

          <Link
            href="/roadmap"
            className="text-sm font-medium text-muted-foreground hover:text-landing-text transition-colors"
          >
            {t('roadmap')}
          </Link>

          <a
            href="https://github.com/Qiplim/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-landing-text transition-colors"
          >
            <Github className="h-4 w-4" />
            {t('github')}
          </a>
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Link href="/dashboard">
              {t('getStarted')} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-landing-border px-4 pb-4 pt-2 space-y-1">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('product')}
          </p>
          <Link
            href="/education"
            className="block px-3 py-2 text-sm text-muted-foreground hover:text-landing-text transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {t('useCases')}
          </Link>
          <Link
            href="/on-premise"
            className="block px-3 py-2 text-sm text-muted-foreground hover:text-landing-text transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {t('onPremise')}
          </Link>

          <hr className="my-2 border-landing-border" />

          <Link
            href="/developers"
            className="block px-3 py-2 text-sm text-muted-foreground hover:text-landing-text transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {t('developers')}
          </Link>
          <Link
            href="/pricing"
            className="block px-3 py-2 text-sm text-muted-foreground hover:text-landing-text transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {t('pricing')}
          </Link>
          <Link
            href="/roadmap"
            className="block px-3 py-2 text-sm text-muted-foreground hover:text-landing-text transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {t('roadmap')}
          </Link>
          <a
            href="https://github.com/Qiplim/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-landing-text transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <Github className="h-4 w-4" />
            {t('github')}
          </a>

          <hr className="my-2 border-landing-border" />

          <div className="px-3 py-2">
            <LanguageSwitcher />
          </div>
          <div className="px-3 pt-1">
            <Button asChild className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
              <Link href="/dashboard">
                {t('getStarted')} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
