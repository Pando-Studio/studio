'use client';

import { Button } from '@/components/ui/button';
import {
  Github,
  CheckCircle2,
  Clock,
  Circle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
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
  const tRoadmap = useTranslations('roadmap');

  const grouped = {
    done: roadmapPhases.filter((p) => p.status === 'done'),
    'in-progress': roadmapPhases.filter((p) => p.status === 'in-progress'),
    planned: roadmapPhases.filter((p) => p.status === 'planned'),
  };

  return (
    <div className="min-h-screen font-sans">
      <PublicHeader />

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

      <PublicFooter />
    </div>
  );
}
