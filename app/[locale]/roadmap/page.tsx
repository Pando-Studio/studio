'use client';

import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Menu,
  X,
  Github,
  CheckCircle2,
  Clock,
  Circle,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  roadmapPhases,
  statusConfig,
  type RoadmapStatus,
} from '@/lib/data/roadmap';

const statusIcons: Record<RoadmapStatus, React.ComponentType<{ className?: string }>> = {
  done: CheckCircle2,
  'in-progress': Clock,
  planned: Circle,
};

export default function RoadmapPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations();
  const tRoadmap = useTranslations('roadmap');

  const navLinks = [
    { label: t('nav.widgets'), href: '#widgets' },
    { label: t('nav.useCases'), href: '#use-cases' },
    { label: t('nav.developers'), href: '/developers' },
    { label: t('nav.roadmap'), href: '/roadmap' },
    {
      label: t('nav.github'),
      href: 'https://github.com/Qiplim/studio',
      external: true,
    },
  ] as const;

  const grouped = {
    done: roadmapPhases.filter((p) => p.status === 'done'),
    'in-progress': roadmapPhases.filter((p) => p.status === 'in-progress'),
    planned: roadmapPhases.filter((p) => p.status === 'planned'),
  };

  return (
    <div className="min-h-screen font-sans">
      {/* ================================================================== */}
      {/*  Nav                                                               */}
      {/* ================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-display font-bold text-lg text-landing-text">
              Qiplim <span className="text-landing-brand">Studio</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              'external' in link && link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors"
                >
                  {link.label}
                </a>
              ) : link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <a href="/dashboard" className="hidden sm:block">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 text-sm font-bold font-display px-5 rounded-lg">
                {t('nav.getStarted')}
              </Button>
            </a>
            <button
              type="button"
              className="md:hidden p-2 text-landing-brand hover:text-landing-text"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-b border-landing-border shadow-sm">
            <ul className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  {'external' in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-display font-semibold text-muted-foreground hover:text-landing-text py-1"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  ) : link.href.startsWith('/') ? (
                    <Link
                      href={link.href}
                      className="block text-sm font-display font-semibold text-muted-foreground hover:text-landing-text py-1"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="block text-sm font-display font-semibold text-muted-foreground hover:text-landing-text py-1"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
              <li className="pt-1">
                <LanguageSwitcher />
              </li>
              <li className="pt-2">
                <a href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold font-display">
                    {t('nav.getStarted')}
                  </Button>
                </a>
              </li>
            </ul>
          </div>
        )}
      </header>

      {/* ================================================================== */}
      {/*  Hero                                                              */}
      {/* ================================================================== */}
      <section className="relative pt-36 sm:pt-44 pb-16 sm:pb-20 bg-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-landing-brand-subtle border border-landing-brand-border text-landing-brand text-sm font-medium font-display">
              <span className="w-2 h-2 rounded-full bg-landing-brand animate-pulse" />
              {tRoadmap('badge')}
            </span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-tight mb-6 text-landing-text animate-fade-up animation-delay-150">
            {tRoadmap('title')}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up animation-delay-300">
            {tRoadmap('subtitle')}
          </p>

          {/* Status legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-up animation-delay-450">
            {(['done', 'in-progress', 'planned'] as RoadmapStatus[]).map(
              (status) => {
                const config = statusConfig[status];
                const StatusIcon = statusIcons[status];
                return (
                  <span
                    key={status}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-display font-semibold ${config.bg} ${config.text}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {tRoadmap(
                      `status${status.charAt(0).toUpperCase() + status.slice(1).replace('-p', 'P')}` as
                        | 'statusDone'
                        | 'statusInProgress'
                        | 'statusPlanned',
                    )}
                  </span>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Timeline                                                          */}
      {/* ================================================================== */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Group: Done */}
          {(['done', 'in-progress', 'planned'] as RoadmapStatus[]).map(
            (groupStatus) => {
              const phases = grouped[groupStatus];
              if (phases.length === 0) return null;
              const config = statusConfig[groupStatus];
              const StatusIcon = statusIcons[groupStatus];

              return (
                <div key={groupStatus} className="mb-16 last:mb-0">
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-8">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}
                    >
                      <StatusIcon className={`w-4 h-4 ${config.text}`} />
                    </div>
                    <h2 className="font-display font-bold text-xl text-landing-text">
                      {tRoadmap(
                        `status${groupStatus.charAt(0).toUpperCase() + groupStatus.slice(1).replace('-p', 'P')}` as
                          | 'statusDone'
                          | 'statusInProgress'
                          | 'statusPlanned',
                      )}
                    </h2>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Phase cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {phases.map((phase) => {
                      const Icon = phase.icon;
                      return (
                        <div
                          key={phase.id}
                          className={`p-6 bg-white border rounded-lg hover:shadow-sm transition-all ${
                            phase.status === 'done'
                              ? 'border-green-200'
                              : phase.status === 'in-progress'
                                ? 'border-yellow-200'
                                : 'border-landing-border'
                          }`}
                        >
                          <div className="mb-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}
                            >
                              <Icon className={`w-5 h-5 ${config.text}`} />
                            </div>
                          </div>
                          <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                            {tRoadmap(`phases.${phase.id}.title`)}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {tRoadmap(`phases.${phase.id}.description`)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* ================================================================== */}
      {/*  CTA                                                               */}
      {/* ================================================================== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-6 text-landing-text animate-fade-up">
            {tRoadmap('ctaTitle')}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto animate-fade-up animation-delay-150">
            {tRoadmap('ctaSubtitle')}
          </p>
          <a
            href="https://github.com/Qiplim/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="animate-fade-up animation-delay-300 inline-block"
          >
            <Button
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold font-display px-10 py-6 text-base rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <Github className="w-4 h-4 mr-1.5" />
              {tRoadmap('ctaButton')}
            </Button>
          </a>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Footer                                                            */}
      {/* ================================================================== */}
      <footer className="bg-white border-t border-landing-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <nav className="flex items-center gap-6 text-sm font-display font-medium text-muted-foreground">
              <a
                href="https://github.com/Qiplim/studio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                {t('footer.github')}
              </a>
              <a
                href="https://discord.gg/qiplim"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                {t('footer.discord')}
              </a>
              <Link
                href="/docs"
                className="hover:text-landing-text transition-colors"
              >
                {t('footer.documentation')}
              </Link>
              <Link
                href="/developers"
                className="hover:text-landing-text transition-colors"
              >
                {t('footer.api')}
              </Link>
              <Link
                href="/roadmap"
                className="hover:text-landing-text transition-colors"
              >
                {t('footer.roadmap')}
              </Link>
              <a
                href="https://qiplim.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                Qiplim
              </a>
              <a
                href="https://pando-studio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                Pando Studio
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">
              {t('footer.madeBy')}{' '}
              <a
                href="https://pando-studio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:text-landing-brand transition-colors"
              >
                Pando Studio
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
