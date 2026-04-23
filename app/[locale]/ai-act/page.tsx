'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Scale,
  ExternalLink,
  Key,
  FileText,
  UserCheck,
  Server,
  Code2,
  Calendar,
} from 'lucide-react';

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
      {icon}
      {children}
    </h2>
  );
}

export default function AIActPage() {
  const t = useTranslations('aiAct');

  const highRiskCases = [
    t('highRisk1'),
    t('highRisk2'),
    t('highRisk3'),
    t('highRisk4'),
  ];

  const checklistItems = [
    t('check1'),
    t('check2'),
    t('check3'),
    t('check4'),
    t('check5'),
    t('check6'),
    t('check7'),
    t('check8'),
  ];

  const techFeatures = [
    { titleKey: 'techFeature1Title', descKey: 'techFeature1Desc', icon: <Key className="h-5 w-5 text-primary" /> },
    { titleKey: 'techFeature2Title', descKey: 'techFeature2Desc', icon: <FileText className="h-5 w-5 text-primary" /> },
    { titleKey: 'techFeature3Title', descKey: 'techFeature3Desc', icon: <UserCheck className="h-5 w-5 text-primary" /> },
    { titleKey: 'techFeature4Title', descKey: 'techFeature4Desc', icon: <Server className="h-5 w-5 text-primary" /> },
    { titleKey: 'techFeature5Title', descKey: 'techFeature5Desc', icon: <Code2 className="h-5 w-5 text-primary" /> },
  ];

  const timelineItems = [
    t('timeline1'),
    t('timeline2'),
    t('timeline3'),
    t('timeline4'),
  ];

  const resources = [
    { titleKey: 'resource1', urlKey: 'resource1Url' },
    { titleKey: 'resource2', urlKey: 'resource2Url' },
    { titleKey: 'resource3', urlKey: 'resource3Url' },
    { titleKey: 'resource4', urlKey: 'resource4Url' },
  ];

  const scenarios = [
    { titleKey: 'scenario1Title', descKey: 'scenario1Desc', obligKey: 'scenario1Obligations', variant: 'green' as const },
    { titleKey: 'scenario2Title', descKey: 'scenario2Desc', obligKey: 'scenario2Obligations', variant: 'yellow' as const },
    { titleKey: 'scenario3Title', descKey: 'scenario3Desc', obligKey: 'scenario3Obligations', variant: 'red' as const },
  ];

  const variantStyles = {
    green: 'border-green-500/30 bg-green-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    red: 'border-red-500/30 bg-red-500/5',
  };

  const variantDots = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          {t('backToHome')}
        </Link>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">{t('title')}</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-2">{t('subtitle')}</p>
          <p className="text-sm text-muted-foreground italic">{t('lastUpdated')}</p>
        </div>

        {/* Overview */}
        <section className="mb-12">
          <SectionTitle icon={<Scale className="h-6 w-6 text-primary" />}>
            {t('overviewTitle')}
          </SectionTitle>
          <p className="text-muted-foreground leading-relaxed">{t('overviewText')}</p>
        </section>

        {/* Classification */}
        <section className="mb-12">
          <SectionTitle icon={<AlertTriangle className="h-6 w-6 text-primary" />}>
            {t('classificationTitle')}
          </SectionTitle>
          <p className="text-muted-foreground mb-6">{t('classificationText')}</p>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {t('notHighRiskTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('notHighRiskText')}</p>
              </CardContent>
            </Card>

            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  {t('couldBeHighRiskTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{t('couldBeHighRiskText')}</p>
                <ul className="space-y-1.5">
                  {highRiskCases.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-500 mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="text-sm font-medium flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              {t('highRiskWarning')}
            </p>
          </div>
        </section>

        {/* Obligations by scenario */}
        <section className="mb-12">
          <SectionTitle icon={<FileText className="h-6 w-6 text-primary" />}>
            {t('obligationsTitle')}
          </SectionTitle>
          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <Card key={scenario.titleKey} className={variantStyles[scenario.variant]}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${variantDots[scenario.variant]}`} />
                    {t(scenario.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t(scenario.descKey)}</p>
                  <p className="text-sm font-medium">{t(scenario.obligKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Checklist */}
        <section className="mb-12">
          <SectionTitle icon={<CheckCircle2 className="h-6 w-6 text-primary" />}>
            {t('checklistTitle')}
          </SectionTitle>
          <div className="space-y-3">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="h-5 w-5 rounded border-2 border-muted-foreground/30 mt-0.5 shrink-0 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                </div>
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technical measures */}
        <section className="mb-12">
          <SectionTitle icon={<Shield className="h-6 w-6 text-primary" />}>
            {t('technicalTitle')}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {techFeatures.map((feature) => (
              <Card key={feature.titleKey}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {feature.icon}
                    {t(feature.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-12">
          <SectionTitle icon={<Calendar className="h-6 w-6 text-primary" />}>
            {t('timelineTitle')}
          </SectionTitle>
          <div className="space-y-3 relative ml-3">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />
            {timelineItems.map((item, i) => {
              const isActive = i <= 2; // 2025-2026 items are active/past
              return (
                <div key={i} className="flex items-start gap-4 pl-6 relative">
                  <div className={`absolute left-[-4px] top-2 h-2.5 w-2.5 rounded-full border-2 ${isActive ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/30'}`} />
                  <p className={`text-sm ${isActive ? '' : 'text-muted-foreground'}`}>{item}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Resources */}
        <section className="mb-12">
          <SectionTitle icon={<ExternalLink className="h-6 w-6 text-primary" />}>
            {t('resourcesTitle')}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {resources.map((resource) => (
              <a
                key={resource.titleKey}
                href={t(resource.urlKey)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary/50 transition-colors group"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="text-sm group-hover:text-primary transition-colors">{t(resource.titleKey)}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground italic">{t('disclaimer')}</p>
        </div>
      </div>
    </div>
  );
}
