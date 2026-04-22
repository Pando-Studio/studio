'use client';

import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  CheckSquare,
  Cloud,
  StickyNote,
  BarChart3,
  Users,
  Headphones,
  Layers,
  Clock,
  MessageCircle,
  Video,
  Brain,
  FileText,
  Table2,
  BookOpen,
  Image,
  ListChecks,
  CalendarDays,
  GraduationCap,
  Upload,
  Sparkles,
  Play,
  Key,
  Search,
  Radio,
  Code2,
  Braces,
  Server,
  Github,
  ArrowRight,
  Menu,
  X,
  Check,
  Terminal,
  Bot,
  FileJson,
  Building2,
  Globe,
  Shield,
  Eye,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';

/* -------------------------------------------------------------------------- */
/*  Widget Catalog Data                                                       */
/* -------------------------------------------------------------------------- */

type WidgetCategory = 'interactive' | 'static' | 'media' | 'pedagogical';

interface Widget {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  category: WidgetCategory;
}

const widgets: Widget[] = [
  // Interactive
  { icon: HelpCircle, label: 'Quiz', category: 'interactive' },
  { icon: CheckSquare, label: 'QCM', category: 'interactive' },
  { icon: Cloud, label: 'Wordcloud', category: 'interactive' },
  { icon: StickyNote, label: 'Post-it', category: 'interactive' },
  { icon: BarChart3, label: 'Ranking', category: 'interactive' },
  { icon: Users, label: 'Roleplay', category: 'interactive' },
  { icon: Layers, label: 'Flashcards', category: 'interactive' },
  { icon: FileText, label: 'Open Text', category: 'interactive' },
  // Static
  { icon: ListChecks, label: 'Summary', category: 'static' },
  { icon: MessageCircle, label: 'FAQ', category: 'static' },
  { icon: BookOpen, label: 'Glossary', category: 'static' },
  { icon: Clock, label: 'Timeline', category: 'static' },
  { icon: FileText, label: 'Report', category: 'static' },
  { icon: Table2, label: 'Data Table', category: 'static' },
  // Media
  { icon: Headphones, label: 'Audio Podcast', category: 'media' },
  { icon: Video, label: 'Video', category: 'media' },
  { icon: Brain, label: 'Mind Map', category: 'media' },
  { icon: Image, label: 'Infographic', category: 'media' },
  // Pedagogical
  { icon: CalendarDays, label: 'Course Plan', category: 'pedagogical' },
  { icon: GraduationCap, label: 'Session Plan', category: 'pedagogical' },
  { icon: BookOpen, label: 'Syllabus', category: 'pedagogical' },
];

const categoryColors: Record<WidgetCategory, { bg: string; text: string }> = {
  interactive: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  static: { bg: 'bg-blue-100', text: 'text-blue-700' },
  media: { bg: 'bg-purple-100', text: 'text-purple-700' },
  pedagogical: { bg: 'bg-green-100', text: 'text-green-700' },
};

type FilterTab = 'all' | WidgetCategory;

/* -------------------------------------------------------------------------- */
/*  Static data                                                               */
/* -------------------------------------------------------------------------- */

const stepIcons = [Upload, Sparkles, Play] as const;

const featureIcons = [Key, Search, Radio, Code2, Braces, Server] as const;

// Open source icons now inline in the section component

/* -------------------------------------------------------------------------- */
/*  Widget Catalog (client component section)                                 */
/* -------------------------------------------------------------------------- */

function WidgetCatalog() {
  const t = useTranslations('widgets');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'interactive', label: t('filterInteractive') },
    { key: 'static', label: t('filterStatic') },
    { key: 'pedagogical', label: t('filterPedagogical') },
    { key: 'media', label: t('filterMedia') },
  ];

  const filtered =
    activeFilter === 'all'
      ? widgets
      : widgets.filter((w) => w.category === activeFilter);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10 animate-fade-up animation-delay-150">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-display font-semibold transition-all ${
              activeFilter === key
                ? 'bg-yellow-500 text-neutral-950'
                : 'bg-white border border-landing-border text-muted-foreground hover:border-landing-brand-border hover:text-landing-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-up animation-delay-300">
        {filtered.map(({ icon: Icon, label, category }) => {
          const colors = categoryColors[category];
          return (
            <div
              key={`${label}-${category}`}
              className="flex flex-col items-center gap-2.5 p-4 bg-white border border-landing-border rounded-md hover:border-landing-brand-border hover:shadow-sm transition-all"
            >
              <Icon className="w-6 h-6 text-landing-brand" />
              <span className="text-sm font-display font-semibold text-landing-text">
                {label}
              </span>
              <span
                className={`text-[10px] font-display font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
              >
                {category}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Language Switcher                                                         */
/* -------------------------------------------------------------------------- */

function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 text-xs font-display font-semibold text-muted-foreground">
      <button
        type="button"
        onClick={() => router.replace(pathname, { locale: 'en' })}
        className="px-1.5 py-0.5 rounded hover:text-landing-text transition-colors"
      >
        EN
      </button>
      <span className="text-landing-border">/</span>
      <button
        type="button"
        onClick={() => router.replace(pathname, { locale: 'fr' })}
        className="px-1.5 py-0.5 rounded hover:text-landing-text transition-colors"
      >
        FR
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations();

  const navLinks = [
    { label: t('nav.widgets'), href: '#widgets' },
    { label: t('nav.useCases'), href: '#use-cases' },
    { label: t('nav.developers'), href: '/developers' },
    { label: t('nav.openSource'), href: '#open-source' },
    {
      label: t('nav.github'),
      href: 'https://github.com/Qiplim/studio',
      external: true,
    },
  ] as const;

  const steps = [
    {
      icon: stepIcons[0],
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Desc'),
    },
    {
      icon: stepIcons[1],
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Desc'),
    },
    {
      icon: stepIcons[2],
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Desc'),
    },
  ];

  const features = [
    {
      icon: featureIcons[0],
      title: t('features.multiLlm'),
      description: t('features.multiLlmDesc'),
    },
    {
      icon: featureIcons[1],
      title: t('features.rag'),
      description: t('features.ragDesc'),
    },
    {
      icon: featureIcons[2],
      title: t('features.realtime'),
      description: t('features.realtimeDesc'),
    },
    {
      icon: featureIcons[3],
      title: t('features.api'),
      description: t('features.apiDesc'),
    },
    {
      icon: featureIcons[4],
      title: t('features.jsonSchema'),
      description: t('features.jsonSchemaDesc'),
    },
    {
      icon: featureIcons[5],
      title: t('features.selfHostable'),
      description: t('features.selfHostableDesc'),
    },
  ];

  return (
    <div className="min-h-screen font-sans">
      {/* ================================================================== */}
      {/*  Nav                                                               */}
      {/* ================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-display font-bold text-lg text-landing-text">
              Qiplim <span className="text-landing-brand">Studio</span>
            </span>
          </Link>

          {/* Center nav (desktop) */}
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

          {/* Right: language switcher + CTA + hamburger */}
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

        {/* Mobile menu */}
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
                <a
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                >
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
      <section className="relative pt-36 sm:pt-44 pb-20 sm:pb-28 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Badge */}
          <div className="text-center mb-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-landing-brand-subtle border border-landing-brand-border text-landing-brand text-sm font-medium font-display">
              <span className="w-2 h-2 rounded-full bg-landing-brand animate-pulse" />
              {t('hero.badge')}
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-center font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight mb-6 text-landing-text animate-fade-up animation-delay-150">
            {t('hero.title')}
          </h1>

          {/* Subtitle */}
          <p className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up animation-delay-300">
            {t('hero.subtitle')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up animation-delay-450">
            <a href="/dashboard">
              <Button
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold font-display px-8 py-6 text-base rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                {t('hero.cta')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <a
              href="https://github.com/Qiplim/studio"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="lg"
                className="font-display font-semibold px-8 py-6 text-base rounded-xl"
              >
                <Github className="w-4 h-4 mr-1.5" />
                {t('hero.github')}
              </Button>
            </a>
          </div>

          {/* Screenshot */}
          <div className="animate-fade-up animation-delay-600">
            <div className="relative mx-auto max-w-4xl rounded-xl border border-landing-border shadow-lg overflow-hidden">
              <img
                src="/images/studio-interface.png"
                alt="Qiplim Studio interface — 3-panel layout with sources, AI chat, and widget generation"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Use Cases                                                         */}
      {/* ================================================================== */}
      <section id="use-cases" className="py-20 sm:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('useCases.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('useCases.subtitle')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 animate-fade-up animation-delay-300">
            {/* Education */}
            <div className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                {t('useCases.educationTitle')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                {t('useCases.educationDesc')}
              </p>
              <Link
                href="/education"
                className="text-sm font-display font-semibold text-landing-brand hover:text-landing-brand-dark transition-colors inline-flex items-center gap-1"
              >
                {t('useCases.educationLink')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                {t('useCases.enterpriseTitle')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {t('useCases.enterpriseDesc')}
              </p>
            </div>

            {/* Developers */}
            <div className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <Code2 className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                {t('useCases.developersTitle')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {t('useCases.developersDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Widget Catalog                                                    */}
      {/* ================================================================== */}
      <section id="widgets" className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('widgets.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('widgets.subtitle')}
          </p>

          <WidgetCatalog />
        </div>
      </section>

      {/* ================================================================== */}
      {/*  How it Works                                                      */}
      {/* ================================================================== */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('howItWorks.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('howItWorks.subtitle')}
          </p>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 animate-fade-up animation-delay-300">
            {steps.map(({ icon: Icon, title, description }, idx) => (
              <div key={title} className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500 border border-yellow-500 font-display font-bold text-lg text-neutral-950">
                    {idx + 1}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent" />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-landing-brand" />
                  <h3 className="font-display font-bold text-xl text-landing-text">
                    {title}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Studio + Qiplim                                                   */}
      {/* ================================================================== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('studioEngage.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('studioEngage.subtitle')}
          </p>

          <div className="grid md:grid-cols-2 gap-6 animate-fade-up animation-delay-300">
            {/* Studio card */}
            <div className="p-8 bg-background border border-landing-border rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="font-display font-bold text-xl text-landing-text mb-3">
                {t('studioEngage.studioTitle')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('studioEngage.studioDesc')}
              </p>
              {/* Screenshot placeholder */}
              <div className="mt-6 w-full h-40 rounded-lg bg-landing-border/30 flex items-center justify-center">
                <span className="text-sm text-muted-foreground font-display">
                  Studio screenshot
                </span>
              </div>
            </div>

            {/* Qiplim card */}
            <div className="p-8 bg-background border border-landing-border rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-display font-bold text-xl text-landing-text mb-3">
                {t('studioEngage.engageTitle')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('studioEngage.engageDesc')}
              </p>
              {/* Screenshot placeholder */}
              <div className="mt-6 w-full h-40 rounded-lg bg-landing-border/30 flex items-center justify-center">
                <span className="text-sm text-muted-foreground font-display">
                  Qiplim screenshot
                </span>
              </div>
              <a
                href="https://qiplim.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-display font-semibold text-landing-brand hover:text-landing-brand-dark transition-colors"
              >
                {t('studioEngage.engageLink')}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Technical Features                                                */}
      {/* ================================================================== */}
      <section id="features" className="py-20 sm:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('features.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('features.subtitle')}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up animation-delay-300">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-6 bg-white border border-landing-border rounded-lg hover:border-landing-brand-border hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-landing-brand-subtle flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-landing-brand" />
                </div>
                <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Open Source                                                       */}
      {/* ================================================================== */}
      <section id="open-source" className="py-20 sm:py-28 bg-landing-brand-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text animate-fade-up">
            {t('openSource.title')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto animate-fade-up animation-delay-150">
            {t('openSource.subtitle')}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-fade-up animation-delay-300">
            {[
              { key: 'security', icon: Shield },
              { key: 'sovereignty', icon: Server },
              { key: 'transparency', icon: Eye },
              { key: 'control', icon: Key },
              { key: 'enterprise', icon: Building2 },
              { key: 'community', icon: Users },
            ].map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="p-6 bg-white border border-landing-border rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-landing-brand-subtle flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-landing-brand" />
                </div>
                <h3 className="font-display font-bold text-lg text-landing-text mb-2">
                  {t(`openSource.${key}`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`openSource.${key}Desc`)}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center animate-fade-up animation-delay-450">
            <a
              href="https://github.com/Qiplim/studio"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="bg-landing-brand hover:bg-landing-brand-dark text-white font-bold font-display px-8 py-6 text-base rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <Github className="w-4 h-4 mr-1.5" />
                {t('openSource.viewOnGithub')}
              </Button>
            </a>
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
          <a
            href="/dashboard"
            className="animate-fade-up animation-delay-300 inline-block"
          >
            <Button
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold font-display px-10 py-6 text-base rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              {t('cta.button')}
              <ArrowRight className="w-4 h-4 ml-1" />
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
            {/* Links */}
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

            {/* Attribution */}
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
