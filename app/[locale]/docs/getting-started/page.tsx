'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui';

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 pb-8">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="text-muted-foreground space-y-2">{children}</div>
      </div>
    </div>
  );
}

export default function GettingStartedPage() {
  const t = useTranslations('docs.gettingStartedPage');

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t('subtitle')}
      </p>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Step number={1} title={t('step1Title')}>
              <p>{t('step1Desc1')}</p>
              <p>{t('step1Desc2')}</p>
            </Step>

            <Step number={2} title={t('step2Title')}>
              <p>{t('step2Desc1')}</p>
              <p>{t('step2Desc2')}</p>
            </Step>

            <Step number={3} title={t('step3Title')}>
              <p>{t('step3Desc1')}</p>
              <p>{t('step3Desc2')}</p>
            </Step>

            <Step number={4} title={t('step4Title')}>
              <p>{t('step4Desc1')}</p>
              <p>{t('step4Desc2')}</p>
            </Step>

            <Step number={5} title={t('step5Title')}>
              <p>{t('step5Desc1')}</p>
              <p>{t('step5Desc2')}</p>
            </Step>

            <Step number={6} title={t('step6Title')}>
              <p>{t('step6Desc1')}</p>
              <p>{t('step6Desc2')}</p>
            </Step>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 p-4 rounded-lg border bg-muted/30">
        <h4 className="font-semibold mb-2">{t('nextStepsTitle')}</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            <Link href="/docs/widget-types" className="text-primary hover:underline">
              {t('nextStepWidgetTypes')}
            </Link>
          </li>
          <li>
            <Link href="/docs/self-hosting" className="text-primary hover:underline">
              {t('nextStepSelfHosting')}
            </Link>
          </li>
          <li>
            <Link href="/docs/api" className="text-primary hover:underline">
              {t('nextStepApi')}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
