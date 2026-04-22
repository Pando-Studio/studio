'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { FileJson, Server, FileText } from 'lucide-react';

interface ApiResource {
  titleKey: string;
  descriptionKey: string;
  href: string;
  icon: React.ReactNode;
}

const resources: ApiResource[] = [
  {
    titleKey: 'resourceOpenapi',
    descriptionKey: 'resourceOpenapiDesc',
    href: '/developers',
    icon: <FileJson className="h-6 w-6 text-primary" />,
  },
  {
    titleKey: 'resourceMcp',
    descriptionKey: 'resourceMcpDesc',
    href: '/developers',
    icon: <Server className="h-6 w-6 text-primary" />,
  },
  {
    titleKey: 'resourceLlmsTxt',
    descriptionKey: 'resourceLlmsTxtDesc',
    href: '/llms.txt',
    icon: <FileText className="h-6 w-6 text-primary" />,
  },
];

function EndpointGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  const methodColors: Record<string, string> = {
    GET: 'text-green-500',
    POST: 'text-blue-500',
    PATCH: 'text-yellow-500',
    DELETE: 'text-red-500',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <span className={`font-mono font-bold text-xs w-14 ${methodColors[method] ?? 'text-muted-foreground'}`}>
        {method}
      </span>
      <code className="text-xs text-muted-foreground flex-1">{path}</code>
      <span className="text-muted-foreground text-xs hidden sm:inline">{description}</span>
    </div>
  );
}

export default function ApiPage() {
  const t = useTranslations('docs.apiPage');

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t('subtitle')}
      </p>

      <div className="grid grid-cols-1 gap-4 mb-10">
        {resources.map((resource) => {
          const isExternal = resource.href.startsWith('/llms');
          if (isExternal) {
            return (
              <a key={resource.titleKey} href={resource.href} target="_blank" rel="noopener noreferrer">
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader className="flex flex-row items-start gap-4">
                    <div className="p-2 rounded-md bg-primary/10">{resource.icon}</div>
                    <div>
                      <CardTitle className="text-base">{t(resource.titleKey)}</CardTitle>
                      <CardDescription className="mt-1">{t(resource.descriptionKey)}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </a>
            );
          }
          return (
            <Link key={resource.titleKey} href={resource.href}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="p-2 rounded-md bg-primary/10">{resource.icon}</div>
                  <div>
                    <CardTitle className="text-base">{t(resource.titleKey)}</CardTitle>
                    <CardDescription className="mt-1">{t(resource.descriptionKey)}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <h2 className="text-2xl font-bold mb-4">{t('endpointsTitle')}</h2>

      <div className="space-y-4">
        <EndpointGroup title="Studios">
          <Endpoint method="GET" path="/api/studios" description={t('endpointListStudios')} />
          <Endpoint method="POST" path="/api/studios" description={t('endpointCreateStudio')} />
          <Endpoint method="GET" path="/api/studios/:id" description={t('endpointGetStudio')} />
          <Endpoint method="PATCH" path="/api/studios/:id" description={t('endpointUpdateStudio')} />
          <Endpoint method="DELETE" path="/api/studios/:id" description={t('endpointDeleteStudio')} />
        </EndpointGroup>

        <EndpointGroup title="Widgets">
          <Endpoint method="GET" path="/api/studios/:id/widgets" description={t('endpointListWidgets')} />
          <Endpoint method="POST" path="/api/studios/:id/widgets" description={t('endpointCreateWidget')} />
          <Endpoint method="PATCH" path="/api/widgets/:id" description={t('endpointUpdateWidget')} />
          <Endpoint method="DELETE" path="/api/widgets/:id" description={t('endpointDeleteWidget')} />
        </EndpointGroup>

        <EndpointGroup title="Sources">
          <Endpoint method="GET" path="/api/studios/:id/sources" description={t('endpointListSources')} />
          <Endpoint method="POST" path="/api/studios/:id/sources" description={t('endpointAddSource')} />
          <Endpoint method="DELETE" path="/api/sources/:id" description={t('endpointDeleteSource')} />
        </EndpointGroup>

        <EndpointGroup title="Chat & AI">
          <Endpoint method="POST" path="/api/studios/:id/chat" description={t('endpointChat')} />
          <Endpoint method="POST" path="/api/studios/:id/generate" description={t('endpointGenerate')} />
        </EndpointGroup>
      </div>

      <div className="mt-8 p-4 rounded-lg border bg-muted/30">
        <h4 className="font-semibold mb-2">{t('authTitle')}</h4>
        <p className="text-sm text-muted-foreground">
          {t('authDescription')}
        </p>
      </div>
    </div>
  );
}
