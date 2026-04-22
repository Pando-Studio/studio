'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Dialog, Input, Label } from '@/components/ui';
import {
  Plus,
  BookOpen,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Users,
  GraduationCap,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';

interface CoursePlan {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  metadata: {
    duration?: string;
    target?: string;
    level?: string;
    style?: string;
    objectives?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface GenerationRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  metadata?: {
    coursePlanId?: string;
    title?: string;
  };
}

const TARGET_LABELS: Record<string, string> = {
  student: 'Etudiants',
  professional: 'Professionnels',
  freelance: 'Professions liberales',
  public: 'Grand public',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  expert: 'Expert',
};

const STYLE_LABELS: Record<string, string> = {
  conservative: 'Theorique',
  normal: 'Mixte',
  creative: 'Pratique',
  immersive: 'Immersif',
  collaborative: 'Collaboratif',
  gamified: 'Gamifie',
  storytelling: 'Narratif',
  'micro-learning': 'Micro-learning',
  'project-based': 'Projet',
  flipped: 'Classe inversee',
};

export default function CoursePlansPage() {
  const params = useParams();
  const router = useRouter();
  const studioId = params.id as string;

  const [coursePlans, setCoursePlans] = useState<CoursePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationRunId, setGenerationRunId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{
    progress: number;
    label: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    courseTitle: '',
    courseDescription: '',
    duration: '5',
    target: 'professional' as const,
    level: 'intermediate' as const,
    style: 'normal',
    objectives: '',
    instructions: '',
  });

  useEffect(() => {
    if (studioId) {
      fetchCoursePlans();
    }
  }, [studioId]);

  // Poll for generation status
  useEffect(() => {
    if (!generationRunId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/studios/${studioId}/generations/${generationRunId}`);
        const data = await response.json();

        if (data.run) {
          if (data.run.status === 'COMPLETED') {
            clearInterval(interval);
            setGenerating(false);
            setGenerationRunId(null);
            setShowGenerateDialog(false);
            fetchCoursePlans();

            // Navigate to the new course plan
            if (data.run.metadata?.coursePlanId) {
              router.push(`/studios/${studioId}/course-plans/${data.run.metadata.coursePlanId}`);
            }
          } else if (data.run.status === 'FAILED') {
            clearInterval(interval);
            setGenerating(false);
            setGenerationRunId(null);
            alert('La generation a echoue. Veuillez reessayer.');
          }
        }
      } catch (error) {
        console.error('Error polling generation status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [generationRunId, studioId, router]);

  const fetchCoursePlans = async () => {
    try {
      const response = await fetch(`/api/studios/${studioId}/course-plans`);
      const data = await response.json();
      setCoursePlans(data.coursePlans || []);
    } catch (error) {
      console.error('Error fetching course plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCoursePlan = async () => {
    if (!formData.courseTitle) return;

    setGenerating(true);

    try {
      const response = await fetch(`/api/studios/${studioId}/generate/course-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: formData.courseTitle,
          courseDescription: formData.courseDescription,
          duration: formData.duration,
          target: formData.target,
          level: formData.level,
          style: formData.style,
          objectives: formData.objectives ? formData.objectives.split('\n').filter(Boolean) : [],
          instructions: formData.instructions,
        }),
      });

      const data = await response.json();
      if (data.runId) {
        setGenerationRunId(data.runId);
        setGenerationProgress({ progress: 0, label: 'Demarrage...' });
      } else {
        setGenerating(false);
        alert('Erreur lors du demarrage de la generation');
      }
    } catch (error) {
      console.error('Error generating course plan:', error);
      setGenerating(false);
    }
  };

  const deleteCoursePlan = async (planId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce plan de cours ?')) return;

    try {
      await fetch(`/api/studios/${studioId}/course-plans/${planId}`, {
        method: 'DELETE',
      });
      setCoursePlans(coursePlans.filter((p) => p.id !== planId));
    } catch (error) {
      console.error('Error deleting course plan:', error);
    }
  };

  const getStatusBadge = (status: CoursePlan['status']) => {
    if (status === 'PUBLISHED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <Check className="h-3 w-3" />
          Publie
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
        <Edit className="h-3 w-3" />
        Brouillon
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Plans de cours</h1>
          <p className="text-muted-foreground mt-1">
            Generez et editez des plans de cours structures avec des activites interactives
          </p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generer un plan
        </Button>
      </div>

      {/* Course plans list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : coursePlans.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Aucun plan de cours</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">
            Generez votre premier plan de cours a partir de vos sources
          </p>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generer un plan
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {coursePlans.map((plan) => (
            <div
              key={plan.id}
              className="border rounded-lg p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg truncate">{plan.title}</h3>
                    {getStatusBadge(plan.status)}
                  </div>

                  {plan.description && (
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {plan.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {plan.metadata?.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {plan.metadata.duration}h
                      </span>
                    )}
                    {plan.metadata?.target && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {TARGET_LABELS[plan.metadata.target] || plan.metadata.target}
                      </span>
                    )}
                    {plan.metadata?.level && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {LEVEL_LABELS[plan.metadata.level] || plan.metadata.level}
                      </span>
                    )}
                    {plan.metadata?.style && (
                      <span className="px-2 py-0.5 bg-muted rounded-full text-xs">
                        {STYLE_LABELS[plan.metadata.style] || plan.metadata.style}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/studios/${studioId}/course-plans/${plan.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteCoursePlan(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={(open) => !generating && setShowGenerateDialog(open)}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Generer un plan de cours</h2>

            {generating ? (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                <p className="font-medium">Generation en cours...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {generationProgress?.label || 'Initialisation...'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="courseTitle">Titre du cours *</Label>
                    <Input
                      id="courseTitle"
                      value={formData.courseTitle}
                      onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                      placeholder="Ex: Introduction au Marketing Digital"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="courseDescription">Description</Label>
                    <textarea
                      id="courseDescription"
                      value={formData.courseDescription}
                      onChange={(e) => setFormData({ ...formData, courseDescription: e.target.value })}
                      placeholder="Decrivez brievement le contenu et les objectifs..."
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration">Duree (heures)</Label>
                      <select
                        id="duration"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="2">2 heures</option>
                        <option value="3">3 heures</option>
                        <option value="5">5 heures</option>
                        <option value="7">7 heures (1 jour)</option>
                        <option value="14">14 heures (2 jours)</option>
                        <option value="21">21 heures (3 jours)</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="target">Public cible</Label>
                      <select
                        id="target"
                        value={formData.target}
                        onChange={(e) =>
                          setFormData({ ...formData, target: e.target.value as typeof formData.target })
                        }
                        className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="student">Etudiants</option>
                        <option value="professional">Professionnels</option>
                        <option value="freelance">Professions liberales</option>
                        <option value="public">Grand public</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="level">Niveau</Label>
                      <select
                        id="level"
                        value={formData.level}
                        onChange={(e) =>
                          setFormData({ ...formData, level: e.target.value as typeof formData.level })
                        }
                        className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="beginner">Debutant</option>
                        <option value="intermediate">Intermediaire</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="style">Style pedagogique</Label>
                      <select
                        id="style"
                        value={formData.style}
                        onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="conservative">Theorique</option>
                        <option value="normal">Mixte</option>
                        <option value="creative">Pratique</option>
                        <option value="immersive">Immersif</option>
                        <option value="collaborative">Collaboratif</option>
                        <option value="gamified">Gamifie</option>
                        <option value="storytelling">Narratif</option>
                        <option value="micro-learning">Micro-learning</option>
                        <option value="project-based">Projet</option>
                        <option value="flipped">Classe inversee</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="objectives">Objectifs pedagogiques (un par ligne)</Label>
                    <textarea
                      id="objectives"
                      value={formData.objectives}
                      onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                      placeholder="Maitriser les concepts de base&#10;Appliquer les techniques apprises&#10;..."
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background min-h-[80px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="instructions">Instructions specifiques</Label>
                    <textarea
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="Instructions ou contraintes specifiques pour la generation..."
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background min-h-[60px]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowGenerateDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={generateCoursePlan}
                    disabled={!formData.courseTitle}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Generer
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
