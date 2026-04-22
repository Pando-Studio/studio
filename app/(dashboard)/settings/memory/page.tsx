'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, Card } from '@/components/ui';
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
import { Brain, Loader2, Trash2, Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

type MemoryCategory = 'preference' | 'context' | 'pedagogical' | 'directive';

interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_CONFIG: Record<MemoryCategory, { label: string; color: string }> = {
  preference: {
    label: 'Preference',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  context: {
    label: 'Contexte',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  pedagogical: {
    label: 'Pedagogique',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  directive: {
    label: 'Directive',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/memory');
      const data = (await response.json()) as { memories: Memory[] };
      setMemories(data.memories || []);
    } catch {
      setError('Erreur lors du chargement des memoires');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/settings/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: editingId, content: editContent.trim() }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        setError(data.error || 'Erreur lors de la mise a jour');
        return;
      }

      setEditingId(null);
      setEditContent('');
      await fetchMemories();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (memoryId: string) => {
    setDeletingId(memoryId);

    try {
      await fetch('/api/settings/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId }),
      });
      await fetchMemories();
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  // Group memories by category
  const groupedMemories = memories.reduce<Record<string, Memory[]>>((acc, memory) => {
    const cat = memory.category || 'context';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(memory);
    return acc;
  }, {});

  const categoryOrder: MemoryCategory[] = ['preference', 'context', 'pedagogical', 'directive'];
  const sortedCategories = categoryOrder.filter((cat) => groupedMemories[cat]?.length);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Memoire IA</h1>
        <p className="text-muted-foreground mt-1">
          L&apos;IA memorise vos preferences et contexte pour personnaliser ses reponses.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 underline hover:no-underline"
          >
            Fermer
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <Card className="p-8 text-center">
          <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg">Aucune memoire enregistree</h3>
          <p className="text-muted-foreground mt-1 text-sm max-w-md mx-auto">
            L&apos;IA commencera a memoriser vos preferences au fil de vos conversations.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((category) => {
            const config = CATEGORY_CONFIG[category];
            const categoryMemories = groupedMemories[category];

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded',
                      config.color,
                    )}
                  >
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {categoryMemories.length} element{categoryMemories.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2">
                  {categoryMemories.map((memory) => {
                    const isEditing = editingId === memory.id;
                    const isDeleting = deletingId === memory.id;

                    return (
                      <Card key={memory.id} className="p-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                              maxLength={1000}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {editContent.length}/1000
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Annuler
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={
                                    saving ||
                                    !editContent.trim() ||
                                    editContent === memory.content
                                  }
                                >
                                  {saving ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Check className="h-3 w-3 mr-1" />
                                  )}
                                  Enregistrer
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm flex-1">{memory.content}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(memory)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Supprimer cette memoire
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette memoire sera definitivement supprimee.
                                      L&apos;IA ne pourra plus l&apos;utiliser pour
                                      personnaliser ses reponses.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(memory.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold mb-2">Comment fonctionne la memoire</h3>
        <p className="text-sm text-muted-foreground">
          Au fil de vos conversations, l&apos;IA identifie automatiquement vos preferences
          pedagogiques, votre contexte et vos directives. Ces informations sont stockees ici
          et utilisees pour personnaliser les futures reponses. Vous pouvez modifier ou
          supprimer chaque memoire a tout moment.
        </p>
      </div>
    </div>
  );
}
