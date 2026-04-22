'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { BookOpen, Blocks, Code2, Server } from 'lucide-react';

interface DocSection {
  titleKey: string;
  descriptionKey: string;
  href: '/docs/getting-started' | '/docs/widget-types' | '/docs/api' | '/docs/self-hosting';
  icon: React.ReactNode;
}

const sections: DocSection[] = [
  {
    titleKey: 'gettingStarted',
    descriptionKey: 'gettingStartedDesc',
    href: '/docs/getting-started',
    icon: <BookOpen className="h-6 w-6 text-primary" />,
  },
  {
    titleKey: 'widgetTypes',
    descriptionKey: 'widgetTypesDesc',
    href: '/docs/widget-types',
    icon: <Blocks className="h-6 w-6 text-primary" />,
  },
  {
    titleKey: 'api',
    descriptionKey: 'apiDesc',
    href: '/docs/api',
    icon: <Code2 className="h-6 w-6 text-primary" />,
  },
  {
    titleKey: 'selfHosting',
    descriptionKey: 'selfHostingDesc',
    href: '/docs/self-hosting',
    icon: <Server className="h-6 w-6 text-primary" />,
  },
];

export default function DocsIndexPage() {
  const t = useTranslations('docs');

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t('subtitle')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <div className="mb-2">{section.icon}</div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {t(section.titleKey)}
                </CardTitle>
                <CardDescription>{t(section.descriptionKey)}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
