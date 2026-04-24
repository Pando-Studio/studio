'use client';

import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  School,
  BookOpen,
  Briefcase,
  Upload,
  Sparkles,
  Eye,
  Rocket,
  Trophy,
  ArrowRight,
  Shield,
  Server,
  Users,
  Github,
  Key,
  Accessibility,
  HelpCircle,
  ChevronRight,
  Monitor,
  Play,
  UserCheck,
  Mail,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ContextTab = 'highSchool' | 'higherEd' | 'corporate';

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const contextTabs: { key: ContextTab; icon: typeof School }[] = [
  { key: 'highSchool', icon: School },
  { key: 'higherEd', icon: GraduationCap },
  { key: 'corporate', icon: Briefcase },
];

const stepIcons = [Upload, Sparkles, Eye, Rocket, Trophy] as const;

const featureItems = [
  { key: 'gdpr' as const, icon: Shield },
  { key: 'selfHost' as const, icon: Server },
  { key: 'multiTenant' as const, icon: Users },
  { key: 'openSource' as const, icon: Github },
  { key: 'byok' as const, icon: Key },
  { key: 'accessible' as const, icon: Accessibility },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState<ContextTab>('highSchool');
  const t = useTranslations('education');

  return (
    <div className="min-h-screen font-sans">
      <PublicHeader />

      {/* ================================================================== */}
      {/*  Hero                                                              */}
      {/* ================================================================== */}
      <section className="relative pt-36 sm:pt-44 pb-20 sm:pb-28 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Badge */}
          <div className="text-center mb-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-landing-brand-subtle border border-landing-brand-border text-landing-brand text-sm font-medium font-display">
              <GraduationCap className="w-4 h-4" />
              {t('badge')}
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-center font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight mb-6 text-landing-text animate-fade-up animation-delay-150">
            {t('title')}
          </h1>

          {/* Subtitle */}
          <p className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up animation-delay-300">
            {t('subtitle')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animation-delay-450">
            <a href="/dashboard">
              <Button
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold font-display px-8 py-6 text-base rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                {t('cta.getStarted')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <a href="mailto:bonsoir@pando-studio.com">
              <Button
                variant="outline"
                size="lg"
                className="font-display font-semibold px-8 py-6 text-base rounded-xl"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                {t('cta.contact')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Context Tabs                                                      */}
      {/* ================================================================== */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 animate-fade-up">
            {contextTabs.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-display font-semibold text-sm transition-all
                  ${
                    activeTab === key
                      ? 'bg-landing-brand text-white shadow-sm'
                      : 'bg-white border border-landing-border text-muted-foreground hover:border-landing-brand-border hover:text-landing-text'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {t(`tabs.${key}`)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="animate-fade-up animation-delay-150">
            <ContextPanel tab={activeTab} t={t} />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Studio + Engage for Education                                     */}
      {/* ================================================================== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('studioEngage.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('studioEngage.subtitle')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 animate-fade-up animation-delay-300">
            {/* Studio */}
            <div className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-landing-brand-subtle flex items-center justify-center mb-4">
                <Monitor className="w-5 h-5 text-landing-brand" />
              </div>
              <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                {t('studioEngage.studioTitle')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('studioEngage.studioDesc')}
              </p>
            </div>

            {/* Engage */}
            <div className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-4">
                <Play className="w-5 h-5 text-yellow-700" />
              </div>
              <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                {t('studioEngage.engageTitle')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('studioEngage.engageDesc')}
              </p>
            </div>

            {/* Self-paced */}
            <div className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-landing-brand-subtle flex items-center justify-center mb-4">
                <UserCheck className="w-5 h-5 text-landing-brand" />
              </div>
              <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                {t('studioEngage.selfPacedTitle')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('studioEngage.selfPacedDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Features for Education                                            */}
      {/* ================================================================== */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('features.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('features.subtitle')}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up animation-delay-300">
            {featureItems.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-landing-brand-subtle flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-landing-brand" />
                </div>
                <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                  {t(`features.${key}`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`features.${key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Final CTA                                                         */}
      {/* ================================================================== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-6 text-landing-text animate-fade-up">
            {t('cta.title')}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto animate-fade-up animation-delay-150">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animation-delay-300">
            <a href="/dashboard">
              <Button
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold font-display px-10 py-6 text-base rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                {t('cta.getStarted')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <a href="mailto:bonsoir@pando-studio.com">
              <Button
                variant="outline"
                size="lg"
                className="font-display font-semibold px-8 py-6 text-base rounded-xl"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                {t('cta.contact')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Context Panel                                                             */
/* -------------------------------------------------------------------------- */

function ContextPanel({
  tab,
  t,
}: {
  tab: ContextTab;
  t: ReturnType<typeof useTranslations<'education'>>;
}) {
  const steps = [
    t(`${tab}.step1`),
    t(`${tab}.step2`),
    t(`${tab}.step3`),
    t(`${tab}.step4`),
    t(`${tab}.step5`),
  ];

  return (
    <div className="bg-white border border-landing-border rounded-xl p-6 sm:p-8">
      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-landing-brand-subtle border border-landing-brand-border text-landing-brand text-xs font-medium font-display mb-6">
        {t(`${tab}.badge`)}
      </span>

      {/* Title */}
      <h3 className="font-display font-bold text-2xl text-landing-text mb-8">
        {t(`${tab}.title`)}
      </h3>

      {/* Workflow steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step, idx) => {
          const Icon = stepIcons[idx];
          return (
            <div key={idx} className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-500 shrink-0">
                <Icon className="w-4 h-4 text-neutral-950" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-landing-text font-display">
                  {step}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Widgets + Specifics */}
      <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t border-landing-border">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-landing-brand" />
            <h4 className="font-display font-semibold text-sm text-landing-text">
              {t(`${tab}.widgetsTitle`)}
            </h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(`${tab}.widgets`)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-landing-brand" />
            <h4 className="font-display font-semibold text-sm text-landing-text">
              {t(`${tab}.specificsTitle`)}
            </h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(`${tab}.specifics`)}
          </p>
        </div>
      </div>
    </div>
  );
}
