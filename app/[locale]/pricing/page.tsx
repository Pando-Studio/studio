'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  Check,
  X,
  Github,
  ArrowRight,
  Mail,
  Sparkles,
  Cloud,
  Server,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Feature list item                                                          */
/* -------------------------------------------------------------------------- */

function Feature({ included, children }: { included: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {included ? (
        <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
      )}
      <span className={included ? 'text-landing-text' : 'text-muted-foreground/60'}>
        {children}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ item                                                                   */
/* -------------------------------------------------------------------------- */

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-landing-border rounded-lg">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-display font-semibold text-sm text-landing-text">{question}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PricingPage() {
  const t = useTranslations('pricing');
  const faqItems = [
    { q: t('faq.byokQ'), a: t('faq.byokA') },
    { q: t('faq.cancelQ'), a: t('faq.cancelA') },
    { q: t('faq.limitQ'), a: t('faq.limitA') },
    { q: t('faq.selfHostedFreeQ'), a: t('faq.selfHostedFreeA') },
    { q: t('faq.enterpriseQ'), a: t('faq.enterpriseA') },
    { q: t('faq.educationQ'), a: t('faq.educationA') },
  ];

  return (
    <div className="min-h-screen font-sans">
      <PublicHeader />

      {/* ================================================================== */}
      {/*  Hero                                                              */}
      {/* ================================================================== */}
      <section className="relative pt-36 sm:pt-44 pb-16 sm:pb-20 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="mb-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-landing-brand-subtle border border-landing-brand-border text-landing-brand text-sm font-medium font-display">
              <Sparkles className="w-4 h-4" />
              {t('badge')}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-tight mb-6 text-landing-text animate-fade-up animation-delay-150">
            {t('title')}
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up animation-delay-300">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Cloud Plans                                                       */}
      {/* ================================================================== */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 mb-8 animate-fade-up">
            <Cloud className="h-6 w-6 text-landing-brand" />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-landing-text">
              {t('cloudTitle')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 animate-fade-up animation-delay-150">
            {/* Free card */}
            <Card className="border border-landing-border bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl">{t('free.name')}</CardTitle>
                <div className="mt-2">
                  <span className="font-display font-extrabold text-4xl text-landing-text">
                    {t('free.price')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t('free.subtitle')}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  <Feature included>{t('free.feature1')}</Feature>
                  <Feature included>{t('free.feature2')}</Feature>
                  <Feature included={false}>{t('free.feature3')}</Feature>
                  <Feature included={false}>{t('free.feature4')}</Feature>
                  <Feature included={false}>{t('free.feature5')}</Feature>
                </ul>
                <Button
                  variant="outline"
                  className="w-full font-display font-semibold rounded-lg"
                  asChild
                >
                  <Link href="/dashboard">
                    {t('free.cta')}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro card */}
            <Card className="border-2 border-yellow-500 bg-white relative">
              <div className="absolute -top-3 left-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500 text-neutral-950 text-xs font-bold font-display">
                  {t('pro.badge')}
                </span>
              </div>
              <CardHeader className="pb-4 pt-8">
                <CardTitle className="font-display text-xl">{t('pro.name')}</CardTitle>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display font-extrabold text-4xl text-landing-text">
                    {t('pro.price')}
                  </span>
                  <span className="text-sm text-muted-foreground">{t('pro.period')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t('pro.subtitle')}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  <Feature included>{t('pro.feature1')}</Feature>
                  <Feature included>{t('pro.feature2')}</Feature>
                  <Feature included>{t('pro.feature3')}</Feature>
                  <Feature included>{t('pro.feature4')}</Feature>
                  <Feature included>{t('pro.feature5')}</Feature>
                  <Feature included>{t('pro.feature6')}</Feature>
                </ul>
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-display font-bold rounded-lg"
                  asChild
                >
                  <Link href="/dashboard">
                    {t('pro.cta')}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Self-hosted Plans                                                 */}
      {/* ================================================================== */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 mb-8 animate-fade-up">
            <Server className="h-6 w-6 text-landing-brand" />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-landing-text">
              {t('selfHostedTitle')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 animate-fade-up animation-delay-150">
            {/* Community card */}
            <Card className="border border-landing-border bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl">{t('community.name')}</CardTitle>
                <div className="mt-2">
                  <span className="font-display font-extrabold text-4xl text-landing-text">
                    {t('community.price')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t('community.subtitle')}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  <Feature included>{t('community.feature1')}</Feature>
                  <Feature included>{t('community.feature2')}</Feature>
                  <Feature included>{t('community.feature3')}</Feature>
                  <Feature included>{t('community.feature4')}</Feature>
                  <Feature included>{t('community.feature5')}</Feature>
                  <Feature included={false}>{t('community.feature6')}</Feature>
                  <Feature included={false}>{t('community.feature7')}</Feature>
                  <Feature included={false}>{t('community.feature8')}</Feature>
                </ul>
                <Button
                  variant="outline"
                  className="w-full font-display font-semibold rounded-lg"
                  asChild
                >
                  <a
                    href="https://github.com/Qiplim/studio"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="mr-1.5 h-4 w-4" />
                    {t('community.cta')}
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise card */}
            <Card className="border-2 border-yellow-500 bg-white relative">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl">{t('enterprise.name')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-2 font-display font-medium">{t('enterprise.badge')}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-extrabold text-4xl text-landing-text">
                    {t('enterprise.price')}
                  </span>
                  <span className="text-sm text-muted-foreground">{t('enterprise.period')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t('enterprise.subtitle')}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  <Feature included>{t('enterprise.feature1')}</Feature>
                  <Feature included>{t('enterprise.feature2')}</Feature>
                  <Feature included>{t('enterprise.feature3')}</Feature>
                  <Feature included>{t('enterprise.feature4')}</Feature>
                  <Feature included>{t('enterprise.feature5')}</Feature>
                  <Feature included>{t('enterprise.feature6')}</Feature>
                </ul>
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-display font-bold rounded-lg"
                  asChild
                >
                  <a href="mailto:contact@pando-studio.com">
                    <Mail className="mr-1.5 h-4 w-4" />
                    {t('enterprise.cta')}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  FAQ                                                               */}
      {/* ================================================================== */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-2xl sm:text-3xl tracking-tight mb-10 text-landing-text animate-fade-up">
            {t('faq.title')}
          </h2>
          <div className="space-y-3 animate-fade-up animation-delay-150">
            {faqItems.map((item, idx) => (
              <FaqItem key={idx} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
