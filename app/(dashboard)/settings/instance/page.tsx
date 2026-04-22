'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label, Switch } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Shield } from 'lucide-react';

// ── All 28 widget types with labels ──

const WIDGET_TYPES = [
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'WORDCLOUD', label: 'Nuage de mots' },
  { value: 'ROLEPLAY', label: 'Jeu de role' },
  { value: 'PRESENTATION', label: 'Presentation' },
  { value: 'SLIDE', label: 'Slide' },
  { value: 'MULTIPLE_CHOICE', label: 'Choix multiple' },
  { value: 'POSTIT', label: 'Post-it' },
  { value: 'RANKING', label: 'Classement' },
  { value: 'OPENTEXT', label: 'Texte ouvert' },
  { value: 'SEQUENCE', label: 'Sequence' },
  { value: 'COURSE_MODULE', label: 'Module de cours' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'GLOSSARY', label: 'Glossaire' },
  { value: 'SUMMARY', label: 'Resume' },
  { value: 'FLASHCARD', label: 'Flashcard' },
  { value: 'TIMELINE', label: 'Timeline' },
  { value: 'REPORT', label: 'Rapport' },
  { value: 'DATA_TABLE', label: 'Tableau de donnees' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'MINDMAP', label: 'Carte mentale' },
  { value: 'INFOGRAPHIC', label: 'Infographie' },
  { value: 'SYLLABUS', label: 'Syllabus' },
  { value: 'SESSION_PLAN', label: 'Plan de session' },
  { value: 'PROGRAM_OVERVIEW', label: 'Vue programme' },
  { value: 'CLASS_OVERVIEW', label: 'Vue classe' },
  { value: 'QCM', label: 'QCM' },
] as const;

const LOCALES = [
  { value: 'fr-lmd', label: 'Francais - Licence/Master/Doctorat' },
  { value: 'fr-secondary', label: 'Francais - Secondaire' },
  { value: 'fr-pro', label: 'Francais - Formation professionnelle' },
  { value: 'generic', label: 'Generique' },
] as const;

interface InstanceConfig {
  id: string;
  name: string;
  logo: string | null;
  locale: string;
  enabledWidgets: string[];
  settings: Record<string, unknown>;
  updatedAt: string;
}

export default function InstanceSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [locale, setLocale] = useState('generic');
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>([]);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/config');

      if (response.status === 403) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        setError('Erreur lors du chargement de la configuration');
        return;
      }

      const data = (await response.json()) as InstanceConfig;
      setName(data.name);
      setLogo(data.logo || '');
      setLocale(data.locale);
      setEnabledWidgets(data.enabledWidgets);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          logo: logo || null,
          locale,
          enabledWidgets,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        setError(data.error || 'Erreur lors de la sauvegarde');
        return;
      }

      setSuccess('Configuration sauvegardee avec succes');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const toggleWidget = (widgetType: string) => {
    setEnabledWidgets((prev) =>
      prev.includes(widgetType)
        ? prev.filter((w) => w !== widgetType)
        : [...prev, widgetType],
    );
  };

  const toggleAll = () => {
    if (enabledWidgets.length === WIDGET_TYPES.length) {
      setEnabledWidgets([]);
    } else {
      setEnabledWidgets(WIDGET_TYPES.map((w) => w.value));
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold">Configuration de l&apos;instance</h1>
        </div>
        <p className="text-muted-foreground">
          Parametres globaux de l&apos;instance Qiplim Studio. Reservee aux administrateurs.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Instance Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Informations generales</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance-name">Nom de l&apos;instance</Label>
              <Input
                id="instance-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Qiplim Studio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance-logo">Logo (URL)</Label>
              <Input
                id="instance-logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                URL directe vers l&apos;image du logo. Pas d&apos;upload pour le moment.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance-locale">Locale</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="instance-locale">
                  <SelectValue placeholder="Choisir une locale" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Widget Types */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Widgets actifs</h2>
              <p className="text-sm text-muted-foreground">
                {enabledWidgets.length} / {WIDGET_TYPES.length} types actives
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {enabledWidgets.length === WIDGET_TYPES.length
                ? 'Tout desactiver'
                : 'Tout activer'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WIDGET_TYPES.map((widget) => (
              <div
                key={widget.value}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <span className="text-sm font-medium">{widget.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {widget.value}
                  </span>
                </div>
                <Switch
                  checked={enabledWidgets.includes(widget.value)}
                  onCheckedChange={() => toggleWidget(widget.value)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>
    </div>
  );
}
