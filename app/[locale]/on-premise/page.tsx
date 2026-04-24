'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import {
  Server,
  ShieldCheck,
  Coins,
  Scale,
  Gauge,
  Cpu,
  Download,
  Terminal,
  Settings,
  Wifi,
  Upload,
  FolderSync,
  Code2,
  GraduationCap,
  Building2,
  Github,
  BookOpen,
  Zap,
  ArrowRight,
} from 'lucide-react';

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="my-3">
      {label && <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>}
      <pre className="bg-background border border-border rounded-lg p-3 font-mono text-sm overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
      {icon}
      {children}
    </h2>
  );
}

export default function OnPremisePage() {
  const t = useTranslations('onPremise');

  const whyCards = [
    { titleKey: 'why1Title', descKey: 'why1Desc', icon: <ShieldCheck className="h-5 w-5 text-primary" /> },
    { titleKey: 'why2Title', descKey: 'why2Desc', icon: <Coins className="h-5 w-5 text-primary" /> },
    { titleKey: 'why3Title', descKey: 'why3Desc', icon: <Scale className="h-5 w-5 text-primary" /> },
    { titleKey: 'why4Title', descKey: 'why4Desc', icon: <Gauge className="h-5 w-5 text-primary" /> },
  ];

  const hwRows = [
    { config: 'hw1Config', ram: '16 GB', models: 'hw1Models', perf: 'hw1Perf', price: 'hw1Price' },
    { config: 'hw2Config', ram: 'hw2Ram', models: 'hw2Models', perf: 'hw2Perf', price: 'hw2Price' },
    { config: 'hw3Config', ram: 'hw3Ram', models: 'hw3Models', perf: 'hw3Perf', price: 'hw3Price' },
    { config: 'hw4Config', ram: 'hw4Ram', models: 'hw4Models', perf: 'hw4Perf', price: 'hw4Price' },
  ];

  const steps = [
    {
      titleKey: 'step1Title', descKey: 'step1Desc', icon: <Download className="h-5 w-5" />,
      code: (
        <>
          <CodeBlock label={t('step1MacCmd')}>brew install ollama{'\n'}ollama serve</CodeBlock>
          <CodeBlock label={t('step1LinuxCmd')}>curl -fsSL https://ollama.com/install.sh | sh{'\n'}ollama serve</CodeBlock>
        </>
      ),
    },
    {
      titleKey: 'step2Title', descKey: 'step2Desc', icon: <Terminal className="h-5 w-5" />,
      code: <CodeBlock>ollama pull mistral-small{'\n'}# or: ollama pull qwen3:8b{'\n'}# or: ollama pull llama3.3:8b</CodeBlock>,
    },
    {
      titleKey: 'step3Title', descKey: 'step3Desc', icon: <Code2 className="h-5 w-5" />,
      code: <CodeBlock>git clone https://github.com/Qiplim/studio.git{'\n'}cd studio{'\n'}pnpm install{'\n'}pnpm docker:up    # PostgreSQL + Redis{'\n'}pnpm db:push{'\n'}pnpm dev</CodeBlock>,
    },
    {
      titleKey: 'step4Title', descKey: 'step4Desc', icon: <Settings className="h-5 w-5" />,
      code: <CodeBlock>cp .env.example .env{'\n'}{'\n'}# Edit .env:{'\n'}DATABASE_URL=postgresql://qiplim:qiplim@localhost:5433/qiplim_studio{'\n'}REDIS_URL=redis://localhost:6379{'\n'}BETTER_AUTH_SECRET=your-secret-here{'\n'}BYOK_ENCRYPTION_KEY=your-32-char-key-here</CodeBlock>,
    },
    {
      titleKey: 'step5Title', descKey: 'step5Desc', icon: <Wifi className="h-5 w-5" />,
      code: <CodeBlock># In .env, set your LAN IP:{'\n'}NEXT_PUBLIC_APP_URL=http://192.168.1.42:3001{'\n'}{'\n'}# Start the production server:{'\n'}pnpm build && pnpm start</CodeBlock>,
    },
  ];

  const dataCards = [
    { titleKey: 'data1Title', descKey: 'data1Desc', icon: <Upload className="h-5 w-5 text-primary" /> },
    { titleKey: 'data2Title', descKey: 'data2Desc', icon: <FolderSync className="h-5 w-5 text-primary" /> },
    { titleKey: 'data3Title', descKey: 'data3Desc', icon: <Code2 className="h-5 w-5 text-primary" /> },
  ];

  const lanSteps = [t('lan1'), t('lan2'), t('lan3'), t('lan4')];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">{t('title')}</h1>
          </div>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Why on-premise */}
        <section className="mb-12">
          <SectionTitle icon={<ShieldCheck className="h-6 w-6 text-primary" />}>
            {t('whyTitle')}
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {whyCards.map((card) => (
              <Card key={card.titleKey}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {card.icon}
                    {t(card.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t(card.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Hardware */}
        <section className="mb-12">
          <SectionTitle icon={<Cpu className="h-6 w-6 text-primary" />}>
            {t('hardwareTitle')}
          </SectionTitle>
          <p className="text-sm text-muted-foreground mb-4">{t('hardwareNote')}</p>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-3 font-medium">{t('hwConfig')}</th>
                  <th className="text-left p-3 font-medium">{t('hwRam')}</th>
                  <th className="text-left p-3 font-medium">{t('hwModels')}</th>
                  <th className="text-left p-3 font-medium">{t('hwPerf')}</th>
                  <th className="text-left p-3 font-medium">{t('hwPrice')}</th>
                </tr>
              </thead>
              <tbody>
                {hwRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3 font-medium">{t(row.config)}</td>
                    <td className="p-3 text-muted-foreground">{row.ram === '16 GB' ? '16 GB' : t(row.ram)}</td>
                    <td className="p-3 text-muted-foreground text-xs">{t(row.models)}</td>
                    <td className="p-3 font-mono text-xs">{t(row.perf)}</td>
                    <td className="p-3 font-medium">{t(row.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
            <Zap className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{t('powerNote')}</p>
          </div>
        </section>

        {/* Setup guide */}
        <section className="mb-12">
          <SectionTitle icon={<Terminal className="h-6 w-6 text-primary" />}>
            {t('setupTitle')}
          </SectionTitle>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.titleKey} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">{step.icon}</div>
                  <h3 className="font-bold">{t(step.titleKey)}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{t(step.descKey)}</p>
                {step.code}
              </div>
            ))}
          </div>
        </section>

        {/* Provider connection */}
        <section className="mb-12">
          <SectionTitle icon={<Settings className="h-6 w-6 text-primary" />}>
            {t('providerTitle')}
          </SectionTitle>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                {t('providerComingSoon')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t('providerText')}</p>
            <p className="text-sm font-medium mb-2">{t('providerWorkaround')}</p>
            <CodeBlock>pip install litellm{'\n'}litellm --model ollama/mistral-small --port 4000</CodeBlock>
            <p className="text-xs text-muted-foreground mt-2">{t('providerLitellmNote')}</p>
          </div>
        </section>

        {/* Data connection */}
        <section className="mb-12">
          <SectionTitle icon={<Upload className="h-6 w-6 text-primary" />}>
            {t('dataTitle')}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-3">
            {dataCards.map((card) => (
              <Card key={card.titleKey}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {card.icon}
                    {t(card.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{t(card.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* LAN access */}
        <section className="mb-12">
          <SectionTitle icon={<Wifi className="h-6 w-6 text-primary" />}>
            {t('lanTitle')}
          </SectionTitle>
          <p className="text-sm text-muted-foreground mb-4">{t('lanText')}</p>
          <div className="space-y-2">
            {lanSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-12">
          <SectionTitle icon={<GraduationCap className="h-6 w-6 text-primary" />}>
            {t('useCasesTitle')}
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                  {t('useCase1Title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('useCase1Desc')}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  {t('useCase2Title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('useCase2Desc')}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-lg border bg-muted/30 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">{t('ctaTitle')}</h2>
          <p className="text-muted-foreground mb-6">{t('ctaText')}</p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://github.com/Qiplim/studio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <Github className="h-4 w-4" />
              {t('ctaButton')}
            </a>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border font-medium text-sm hover:bg-muted transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              {t('ctaDocs')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      </div>
      <PublicFooter />
    </div>
  );
}
