'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Dialog } from '@/components/ui';
import {
  Plus,
  Sparkles,
  MessageSquare,
  Users,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';

interface Widget {
  id: string;
  title: string;
  type: 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY';
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'ERROR';
  data: Record<string, unknown>;
  createdAt: string;
}

type WidgetType = 'QUIZ' | 'WORDCLOUD' | 'ROLEPLAY';

const WIDGET_TYPES = [
  {
    type: 'QUIZ' as WidgetType,
    name: 'Quiz',
    description: 'Generez des questions a choix multiples',
    icon: Sparkles,
  },
  {
    type: 'WORDCLOUD' as WidgetType,
    name: 'Nuage de mots',
    description: 'Creez une question ouverte pour un wordcloud',
    icon: MessageSquare,
  },
  {
    type: 'ROLEPLAY' as WidgetType,
    name: 'Jeu de roles',
    description: 'Creez un scenario de roleplay pedagogique',
    icon: Users,
  },
];

export default function LibraryPage() {
  const params = useParams();
  const studioId = params.id as string;
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questionCount: 5,
    difficulty: 'medium',
  });

  useEffect(() => {
    if (studioId) {
      fetchWidgets();
    }
  }, [studioId]);

  const fetchWidgets = async () => {
    try {
      const response = await fetch(`/api/studios/${studioId}`);
      const data = await response.json();
      setWidgets(data.studio?.widgets || []);
    } catch (error) {
      console.error('Error fetching widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWidget = async () => {
    if (!selectedType || !formData.title) return;

    setGenerating(true);

    try {
      const endpoint = `/api/studios/${studioId}/generate/${selectedType.toLowerCase()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          questionCount: formData.questionCount,
          difficulty: formData.difficulty,
        }),
      });

      const data = await response.json();
      if (data.widget) {
        setWidgets([data.widget, ...widgets]);
        setShowDialog(false);
        setFormData({ title: '', description: '', questionCount: 5, difficulty: 'medium' });
        setSelectedType(null);
      }
    } catch (error) {
      console.error('Error generating widget:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status: Widget['status']) => {
    switch (status) {
      case 'READY':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'GENERATING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: Widget['type']) => {
    const widgetType = WIDGET_TYPES.find((w) => w.type === type);
    const Icon = widgetType?.icon || Sparkles;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bibliotheque de widgets</h1>
          <p className="text-muted-foreground mt-1">
            Generez des widgets interactifs a partir de vos sources
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generer un widget
        </Button>
      </div>

      {/* Widget types grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {WIDGET_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.type}
              className="border rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => {
                setSelectedType(type.type);
                setShowDialog(true);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{type.name}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Widgets list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Aucun widget genere</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Selectionnez un type ci-dessus pour commencer
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="border rounded-lg p-4 flex items-center gap-4 hover:border-primary/50 cursor-pointer transition-colors"
            >
              <div className="p-2 bg-muted rounded-lg">{getTypeIcon(widget.type)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">{widget.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {widget.type} • {new Date(widget.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(widget.status)}
                <span className="text-sm capitalize">{widget.status.toLowerCase()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              Generer un {selectedType?.toLowerCase() || 'widget'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Titre</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Quiz sur la Revolution francaise"
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description (optionnel)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contexte additionnel pour la generation..."
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background min-h-[80px]"
                />
              </div>

              {selectedType === 'QUIZ' && (
                <>
                  <div>
                    <label className="text-sm font-medium">Nombre de questions</label>
                    <select
                      value={formData.questionCount}
                      onChange={(e) =>
                        setFormData({ ...formData, questionCount: parseInt(e.target.value) })
                      }
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value={3}>3 questions</option>
                      <option value={5}>5 questions</option>
                      <option value={10}>10 questions</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Difficulte</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="easy">Facile</option>
                      <option value="medium">Moyen</option>
                      <option value="hard">Difficile</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
                disabled={generating}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={generateWidget}
                disabled={!formData.title || generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generation...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
