'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Input, Label } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Copy, Check, Loader2, Trash2, KeyRound, AlertTriangle } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CreateKeyResponse extends ApiKey {
  key: string;
  warning: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Reveal key state (shown once after creation)
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/api-keys');
      const data = (await response.json()) as { keys: ApiKey[] };
      setKeys(data.keys || []);
    } catch {
      setError('Erreur lors du chargement des cles API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;

    setCreating(true);
    setCreateError('');

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        setCreateError(data.error || 'Erreur lors de la creation');
        return;
      }

      const data = (await response.json()) as CreateKeyResponse;
      setRevealedKey(data.key);
      setNewKeyName('');
      await fetchKeys();
    } catch {
      setCreateError('Erreur de connexion');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchKeys();
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setNewKeyName('');
    setCreateError('');
    setRevealedKey(null);
    setCopied(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cles API</h1>
          <p className="text-muted-foreground mt-1">
            Gerez vos cles API pour acceder a Qiplim Studio depuis vos outils externes.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => {
          if (!open) handleCloseCreate();
          else setCreateOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Creer une cle
            </Button>
          </DialogTrigger>
          <DialogContent>
            {revealedKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Cle API creee</DialogTitle>
                  <DialogDescription>
                    Copiez cette cle maintenant. Elle ne sera plus affichee.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm break-all">
                    <span className="flex-1">{revealedKey}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyKey}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Cette cle ne sera plus affichee. Conservez-la dans un endroit securise.
                    </span>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleCloseCreate}>Fermer</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Creer une cle API</DialogTitle>
                  <DialogDescription>
                    Donnez un nom a votre cle pour l&apos;identifier facilement.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Nom de la cle</Label>
                    <Input
                      id="key-name"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Ex: Integration CI/CD, Script Python..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKeyName.trim()) {
                          handleCreate();
                        }
                      }}
                    />
                  </div>

                  {createError && (
                    <div className="p-2 rounded bg-red-500/10 text-red-500 text-sm">
                      {createError}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseCreate}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newKeyName.trim() || creating}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Creer
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <Card className="p-8 text-center">
          <KeyRound className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg">Aucune cle API</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Creez votre premiere cle API pour integrer Qiplim Studio avec vos outils.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((apiKey) => (
            <Card key={apiKey.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <KeyRound className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{apiKey.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="font-mono">{apiKey.keyPrefix}...</span>
                      <span>Cree le {formatDate(apiKey.createdAt)}</span>
                      <span>
                        Derniere utilisation : {formatDate(apiKey.lastUsedAt)}
                      </span>
                      {apiKey.expiresAt && (
                        <span>Expire le {formatDate(apiKey.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletingId === apiKey.id}
                    >
                      {deletingId === apiKey.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer la cle API</AlertDialogTitle>
                      <AlertDialogDescription>
                        Etes-vous sur de vouloir supprimer la cle &quot;{apiKey.name}&quot; ?
                        Toutes les integrations utilisant cette cle cesseront de fonctionner.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(apiKey.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold mb-2">A propos des cles API</h3>
        <p className="text-sm text-muted-foreground">
          Les cles API vous permettent d&apos;acceder a Qiplim Studio depuis des scripts,
          pipelines CI/CD ou applications tierces. Chaque cle est unique et associee a votre
          compte. Conservez-les en securite et ne les partagez jamais.
        </p>
      </div>
    </div>
  );
}
