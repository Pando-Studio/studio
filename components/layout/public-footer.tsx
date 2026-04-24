'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function PublicFooter() {
  const t = useTranslations('publicFooter');

  return (
    <footer className="bg-white border-t border-landing-border">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Brand */}
          <div>
            <p className="font-display font-bold text-lg mb-2">
              Qiplim <span className="text-yellow-500">Studio</span>
            </p>
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="font-display font-bold text-sm text-landing-text mb-4">
              {t('product')}
            </h3>
            <nav className="space-y-0">
              <Link
                href="/education"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('useCases')}
              </Link>
              <Link
                href="/pricing"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('pricing')}
              </Link>
              <Link
                href="/on-premise"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('onPremise')}
              </Link>
              <Link
                href="/roadmap"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('roadmap')}
              </Link>
            </nav>
          </div>

          {/* Column 3: Developers */}
          <div>
            <h3 className="font-display font-bold text-sm text-landing-text mb-4">
              {t('developers')}
            </h3>
            <nav className="space-y-0">
              <Link
                href="/developers"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('apiDocs')}
              </Link>
              <Link
                href="/developers"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('widgetTypes')}
              </Link>
              <Link
                href="/developers"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('selfHosting')}
              </Link>
              <Link
                href="/developers"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('mcpServer')}
              </Link>
              <a
                href="/llms.txt"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                llms.txt
              </a>
              <a
                href="/api/v1/openapi.json"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                OpenAPI
              </a>
            </nav>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="font-display font-bold text-sm text-landing-text mb-4">
              {t('company')}
            </h3>
            <nav className="space-y-0">
              <a
                href="https://qiplim.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                Qiplim
              </a>
              <a
                href="https://pando-studio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('pandoStudio')}
              </a>
              <a
                href="https://github.com/Qiplim/studio"
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('github')}
              </a>
              <a
                href="https://discord.gg/qiplim"
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('discord')}
              </a>
            </nav>
          </div>

          {/* Column 5: Legal */}
          <div>
            <h3 className="font-display font-bold text-sm text-landing-text mb-4">
              {t('legal')}
            </h3>
            <nav className="space-y-0">
              <Link
                href="/terms"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('termsOfUse')}
              </Link>
              <Link
                href="/terms-of-sale"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('termsOfSale')}
              </Link>
              <Link
                href="/privacy"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('privacyPolicy')}
              </Link>
              <Link
                href="/ai-act"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('aiAct')}
              </Link>
              <a
                href="https://github.com/Qiplim/studio/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1 text-sm text-muted-foreground hover:text-landing-text transition-colors"
              >
                {t('openCoreLicense')}
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-landing-border text-center text-sm text-muted-foreground">
          {t('copyright')} · {t('license')}
        </div>
      </div>
    </footer>
  );
}
