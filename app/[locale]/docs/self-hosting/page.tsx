'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-background border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto my-4">
      <code>{children}</code>
    </pre>
  );
}

function EnvVar({ name, description, example }: { name: string; description: string; example?: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-4">
        <code className="text-xs bg-muted px-1 py-0.5 rounded">{name}</code>
      </td>
      <td className="py-2 pr-4 text-sm text-muted-foreground">{description}</td>
      {example && <td className="py-2 text-sm text-muted-foreground font-mono">{example}</td>}
    </tr>
  );
}

function TroubleshootItem({ problem, solution }: { problem: string; solution: string }) {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-semibold text-sm mb-1">{problem}</h4>
      <p className="text-sm text-muted-foreground">{solution}</p>
    </div>
  );
}

export default function SelfHostingPage() {
  const t = useTranslations('docs.selfHostingPage');

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t('subtitle')}
      </p>

      {/* Prerequisites */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{t('prerequisites')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Runtime</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Node.js 20+</li>
                <li>pnpm 9.12+</li>
                <li>Docker & Docker Compose</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Services</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>PostgreSQL 16 ({t('withPgvector')})</li>
                <li>Redis 7+</li>
                <li>{t('atLeastOneKey')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Installation */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{t('installation')}</h2>

        <h3 className="text-lg font-semibold mb-2">{t('step1Clone')}</h3>
        <CodeBlock>{`git clone https://github.com/Pando-Studio/qiplim-v2
cd qiplim-v2`}</CodeBlock>

        <h3 className="text-lg font-semibold mb-2">{t('step2Install')}</h3>
        <CodeBlock>pnpm install</CodeBlock>

        <h3 className="text-lg font-semibold mb-2">{t('step3Docker')}</h3>
        <p className="text-muted-foreground mb-2">
          {t('step3DockerDesc')}
        </p>
        <CodeBlock>pnpm docker:up</CodeBlock>
        <p className="text-sm text-muted-foreground mb-4">
          {t('step3DockerPorts')}
        </p>

        <h3 className="text-lg font-semibold mb-2">{t('step4Env')}</h3>
        <CodeBlock>{`cp apps/studio/.env.example apps/studio/.env
# ${t('step4EnvEdit')}`}</CodeBlock>

        <h3 className="text-lg font-semibold mb-2">{t('step5Db')}</h3>
        <CodeBlock>pnpm db:push:studio</CodeBlock>

        <h3 className="text-lg font-semibold mb-2">{t('step6Dev')}</h3>
        <CodeBlock>pnpm dev:studio</CodeBlock>
        <p className="text-muted-foreground">
          {t('step6DevDesc')}
        </p>
      </section>

      {/* Environment Variables */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{t('envConfig')}</h2>
        <p className="text-muted-foreground mb-4">
          {t('envConfigDesc')}
        </p>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 font-semibold text-xs">{t('envVariable')}</th>
                <th className="text-left py-2 px-4 font-semibold text-xs">{t('envDescription')}</th>
                <th className="text-left py-2 px-4 font-semibold text-xs">{t('envExample')}</th>
              </tr>
            </thead>
            <tbody className="px-4">
              <EnvVar
                name="DATABASE_URL"
                description={t('envDatabaseUrl')}
                example="postgresql://qiplim:qiplim@localhost:5433/qiplim_studio"
              />
              <EnvVar
                name="REDIS_URL"
                description={t('envRedisUrl')}
                example="redis://localhost:6379"
              />
              <EnvVar
                name="NEXT_PUBLIC_APP_URL"
                description={t('envAppUrl')}
                example="http://localhost:3001"
              />
              <EnvVar
                name="BETTER_AUTH_SECRET"
                description={t('envAuthSecret')}
                example="(openssl rand -hex 32)"
              />
              <EnvVar
                name="MISTRAL_API_KEY"
                description={t('envMistralKey')}
                example="sk-..."
              />
              <EnvVar
                name="OPENAI_API_KEY"
                description={t('envOpenaiKey')}
                example="sk-..."
              />
              <EnvVar
                name="ANTHROPIC_API_KEY"
                description={t('envAnthropicKey')}
                example="sk-ant-..."
              />
              <EnvVar
                name="GOOGLE_AI_API_KEY"
                description={t('envGoogleKey')}
                example="AIza..."
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Docker Compose */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Docker Compose</h2>
        <p className="text-muted-foreground mb-4">
          {t('dockerComposeDesc')}
        </p>
        <CodeBlock>{`services:
  postgres-studio:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: qiplim
      POSTGRES_PASSWORD: qiplim
      POSTGRES_DB: qiplim_studio
    ports:
      - "5433:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"`}</CodeBlock>
        <p className="text-sm text-muted-foreground">
          {t('dockerComposeNote')}
        </p>
      </section>

      {/* Deployment */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{t('productionDeploy')}</h2>

        <h3 className="text-lg font-semibold mb-2">{t('productionBuild')}</h3>
        <CodeBlock>{`pnpm build:studio
# or
cd apps/studio && pnpm build`}</CodeBlock>

        <h3 className="text-lg font-semibold mb-2 mt-6">{t('cleverCloudDeploy')}</h3>
        <p className="text-muted-foreground mb-4">
          {t('cleverCloudDesc')}
        </p>
        <ul className="text-sm text-muted-foreground space-y-2 mb-4">
          <li>
            <strong>{t('cleverApp')}</strong>
          </li>
          <li>
            <strong>{t('cleverDb')}</strong>
          </li>
          <li>
            <strong>{t('cleverCache')}</strong>
          </li>
          <li>
            <strong>{t('cleverDeploy')}</strong>
          </li>
        </ul>

        <h3 className="text-lg font-semibold mb-2 mt-6">{t('otherPlatforms')}</h3>
        <p className="text-muted-foreground">
          {t('otherPlatformsDesc')}
        </p>
      </section>

      {/* Troubleshooting */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Troubleshooting</h2>

        <div className="space-y-4">
          <TroubleshootItem
            problem={t('troubleDb')}
            solution={t('troubleDbSolution')}
          />
          <TroubleshootItem
            problem={t('troublePgvector')}
            solution={t('troublePgvectorSolution')}
          />
          <TroubleshootItem
            problem={t('troublePrisma')}
            solution={t('troublePrismaSolution')}
          />
          <TroubleshootItem
            problem={t('troubleAi')}
            solution={t('troubleAiSolution')}
          />
        </div>
      </section>
    </div>
  );
}
