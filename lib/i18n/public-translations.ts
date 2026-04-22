'use client';

import { useState, useEffect, useCallback } from 'react';

const translations = {
  fr: {
    loading: 'Chargement...',
    studioNotFound: 'Studio introuvable',
    studioNotFoundDesc:
      "Ce lien de partage n'est plus valide ou le studio n'est pas public.",
    noWidgets: 'Aucun widget disponible',
    noWidgetsDesc: 'Ce studio ne contient pas encore de widgets.',
    previous: 'Précédent',
    next: 'Suivant',
    widgetNotFound: 'Widget introuvable',
    widgetNotFoundDesc: "Ce widget n'existe pas ou n'est pas disponible.",
    edit: 'Modifier',
    back: 'Retour',
    backToStudio: 'Retour au studio',
    widgetOf: 'Widget {current} sur {total}',
    poweredBy: 'Propulsé par Qiplim Studio',
  },
  en: {
    loading: 'Loading...',
    studioNotFound: 'Studio not found',
    studioNotFoundDesc:
      'This share link is no longer valid or the studio is not public.',
    noWidgets: 'No widgets available',
    noWidgetsDesc: 'This studio does not contain any widgets yet.',
    previous: 'Previous',
    next: 'Next',
    widgetNotFound: 'Widget not found',
    widgetNotFoundDesc: 'This widget does not exist or is not available.',
    edit: 'Edit',
    back: 'Back',
    backToStudio: 'Back to studio',
    widgetOf: 'Widget {current} of {total}',
    poweredBy: 'Powered by Qiplim Studio',
  },
} as const;

export type PublicLocale = keyof typeof translations;
export type PublicTranslations = (typeof translations)[PublicLocale];

function detectLocale(): PublicLocale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || '';
  return lang.startsWith('fr') ? 'fr' : 'en';
}

/** Get translations for a given locale (or auto-detect from navigator) */
export function getPublicTranslations(locale?: PublicLocale): PublicTranslations {
  const resolved = locale ?? detectLocale();
  return translations[resolved];
}

/** React hook that provides translations + locale toggle for client components */
export function usePublicTranslations() {
  const [locale, setLocale] = useState<PublicLocale>('en');

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const t = translations[locale];

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'fr' ? 'en' : 'fr'));
  }, []);

  return { t, locale, toggleLocale };
}
