'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { Key, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';

interface ProviderInfo {
  name: string;
  description: string;
  models: {
    chat: string;
    embedding?: string;
    image?: string;
  };
}

interface ProviderConfig {
  provider: string;
  isActive: boolean;
  createdAt: string;
}

const PROVIDER_KEYS = ['mistral', 'openai', 'anthropic', 'google', 'elevenlabs'] as const;
type ProviderKey = (typeof PROVIDER_KEYS)[number];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [envProviders, setEnvProviders] = useState<string[]>([]);
  const [byokProviders, setByokProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProvider, setEditingProvider] = useState<ProviderKey | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/settings/providers');
      const data = await response.json();
      setProviders(data.providers || {});
      setConfigs(data.configs || []);
      setEnvProviders(data.env || []);
      setByokProviders(data.byok || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!editingProvider || !apiKey) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/settings/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: editingProvider,
          apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save API key');
        return;
      }

      await fetchProviders();
      setEditingProvider(null);
      setApiKey('');
    } catch {
      setError('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const deleteApiKey = async (provider: ProviderKey) => {
    try {
      await fetch(`/api/settings/providers?provider=${provider}`, {
        method: 'DELETE',
      });
      await fetchProviders();
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const isConfigured = (provider: string) => {
    return byokProviders.includes(provider) || envProviders.includes(provider);
  };

  const isByok = (provider: string) => byokProviders.includes(provider);
  const isEnv = (provider: string) => envProviders.includes(provider);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configuration des providers AI</h1>
        <p className="text-muted-foreground mt-1">
          Configurez vos cles API pour tous vos projets. Les cles sont partagees entre tous vos studios.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {PROVIDER_KEYS.map((key) => {
            const info = providers[key];
            if (!info) return null;

            const configured = isConfigured(key);
            const hasByok = isByok(key);
            const hasEnv = isEnv(key);
            const isEditing = editingProvider === key;

            return (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${configured ? 'bg-green-500/10' : 'bg-muted'}`}
                    >
                      <Key
                        className={`h-5 w-5 ${configured ? 'text-green-500' : 'text-muted-foreground'}`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{info.name}</h3>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {info.models.chat && (
                          <span className="text-xs text-muted-foreground">
                            Chat: {info.models.chat}
                          </span>
                        )}
                        {info.models.embedding && (
                          <span className="text-xs text-muted-foreground">
                            | Embedding: {info.models.embedding}
                          </span>
                        )}
                        {info.models.image && (
                          <span className="text-xs text-muted-foreground">
                            | Image: {info.models.image}
                          </span>
                        )}
                      </div>
                      {configured && (
                        <div className="flex items-center gap-2 mt-2">
                          {hasByok && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Cle personnelle
                            </span>
                          )}
                          {hasEnv && !hasByok && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              Cle plateforme
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {configured && (
                      <div className="flex items-center gap-1 text-green-500 text-sm">
                        <Check className="h-4 w-4" />
                        Configure
                      </div>
                    )}
                    {hasByok ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteApiKey(key)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(key);
                          setApiKey('');
                          setError('');
                        }}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Ajouter ma cle
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={`Entrez votre cle API ${info.name}...`}
                          className="w-full px-3 py-2 pr-10 border rounded-lg bg-background"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button onClick={saveApiKey} disabled={!apiKey || saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Enregistrer'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProvider(null);
                          setApiKey('');
                          setError('');
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold mb-2">A propos du BYOK (Bring Your Own Key)</h3>
        <p className="text-sm text-muted-foreground">
          Le BYOK vous permet d&apos;utiliser vos propres cles API au lieu des cles par defaut de
          Qiplim. Vos cles sont chiffrees et stockees de maniere securisee. Elles sont
          partagees entre tous vos studios. Vous pouvez egalement configurer des cles specifiques
          par studio dans les parametres de chaque projet.
        </p>
      </div>
    </div>
  );
}
