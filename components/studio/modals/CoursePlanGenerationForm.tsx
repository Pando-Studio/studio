'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoursePlanGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

type CourseTarget = 'student' | 'professional' | 'freelance' | 'public';
type CourseLevel = 'beginner' | 'intermediate' | 'expert';
type CoursePlanStyle =
  | 'conservative'
  | 'normal'
  | 'creative'
  | 'immersive'
  | 'collaborative'
  | 'gamified'
  | 'storytelling'
  | 'micro-learning'
  | 'project-based'
  | 'flipped';

const TARGET_OPTIONS = [
  { value: 'student' as const, label: 'Etudiant' },
  { value: 'professional' as const, label: 'Professionnel' },
  { value: 'freelance' as const, label: 'Profession liberale' },
  { value: 'public' as const, label: 'Grand public' },
];

const LEVEL_OPTIONS = [
  { value: 'beginner' as const, label: 'Debutant' },
  { value: 'intermediate' as const, label: 'Intermediaire' },
  { value: 'expert' as const, label: 'Expert' },
];

const STYLE_OPTIONS = [
  { value: 'conservative' as const, label: 'Theorique', description: 'Transmission structuree des connaissances' },
  { value: 'normal' as const, label: 'Mixte', description: 'Equilibre theorie et pratique' },
  { value: 'creative' as const, label: 'Pratique', description: 'Apprentissage par l\'action' },
  { value: 'immersive' as const, label: 'Immersif', description: 'Mise en situation, simulation' },
  { value: 'collaborative' as const, label: 'Collaboratif', description: 'Travail en groupe, co-construction' },
  { value: 'gamified' as const, label: 'Gamifie', description: 'Defis, recompenses, progression ludique' },
  { value: 'storytelling' as const, label: 'Narratif', description: 'Parcours sous forme d\'histoire' },
  { value: 'micro-learning' as const, label: 'Micro-learning', description: 'Sequences courtes et ciblees' },
  { value: 'project-based' as const, label: 'Projet', description: 'Construction d\'un livrable concret' },
  { value: 'flipped' as const, label: 'Classe inversee', description: 'Theorie en autonomie, pratique en session' },
];

const SECTOR_SUGGESTIONS = [
  'Marketing digital',
  'Management',
  'Communication',
  'Ressources humaines',
  'Finance',
  'Developpement personnel',
  'Informatique',
  'Vente',
  'Leadership',
];

export function CoursePlanGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: CoursePlanGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section 1 - Informations de base
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  // Section 2 - Parametres pedagogiques
  const [showParams, setShowParams] = useState(true);
  const [duration, setDuration] = useState('5');
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');
  const [target, setTarget] = useState<CourseTarget | undefined>(undefined);
  const [sector, setSector] = useState('');
  const [level, setLevel] = useState<CourseLevel | undefined>(undefined);
  const [prerequisites, setPrerequisites] = useState('');
  const [style, setStyle] = useState<CoursePlanStyle | undefined>(undefined);

  // Section 3 - Objectifs pedagogiques
  const [showObjectives, setShowObjectives] = useState(false);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState('');

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const durationValue = durationUnit === 'days'
        ? `${parseInt(duration) * 8}` // Convert days to hours (8h/day)
        : duration;

      const response = await fetch(`/api/studios/${studioId}/generate/course-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: courseTitle || undefined,
          courseDescription: courseDescription || undefined,
          instructions: instructions || undefined,
          duration: durationValue,
          target: target || undefined,
          sector: sector || undefined,
          level: level || undefined,
          prerequisites: prerequisites || undefined,
          style: style || undefined,
          objectives: objectives.length > 0 ? objectives : undefined,
          sourceIds: Array.from(selectedSourceIds),
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la generation');
      }

      const data = await response.json();

      // If run was created successfully, trigger refresh and close modal immediately
      if (data.runId) {
        onGenerated(); // Refresh le contexte (runs)
        onClose(); // Ferme la modal
      }
    } catch (err) {
      console.error('Error generating course plan:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setIsGenerating(false);
    }
  };

  // Error UI component
  const ErrorIndicator = () => {
    if (!error) return null;

    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center gap-2 text-destructive">
          <span className="font-medium">Erreur</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Error indicator */}
      {error && <ErrorIndicator />}

      {/* Section 1 - Informations de base */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Informations de base
        </h3>

        <div className="space-y-2">
          <Label htmlFor="courseTitle">Titre de la formation (optionnel)</Label>
          <Input
            id="courseTitle"
            placeholder="Sera genere automatiquement depuis les sources"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="courseDescription">Description (optionnelle)</Label>
          <textarea
            id="courseDescription"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            placeholder="Sera generee automatiquement"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Consignes pour la generation</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            placeholder="Precisez vos attentes pour le plan de cours..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={isGenerating}
          />
        </div>
      </div>

      {/* Section 2 - Parametres pedagogiques */}
      <div className="space-y-4">
        <button
          className="flex items-center gap-2 text-sm font-medium"
          onClick={() => setShowParams(!showParams)}
          disabled={isGenerating}
        >
          {showParams ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="text-muted-foreground uppercase tracking-wide">Parametres pedagogiques</span>
        </button>

        {showParams && (
          <div className="space-y-4 pl-4 border-l-2">
            {/* Duree */}
            <div className="space-y-2">
              <Label>Duree</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-24"
                  disabled={isGenerating}
                />
                <div className="flex">
                  <Button
                    type="button"
                    variant={durationUnit === 'hours' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDurationUnit('hours')}
                    className="rounded-r-none"
                    disabled={isGenerating}
                  >
                    Heures
                  </Button>
                  <Button
                    type="button"
                    variant={durationUnit === 'days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDurationUnit('days')}
                    className="rounded-l-none"
                    disabled={isGenerating}
                  >
                    Jours
                  </Button>
                </div>
              </div>
            </div>

            {/* Public cible */}
            <div className="space-y-2">
              <Label>Public cible</Label>
              <div className="flex flex-wrap gap-2">
                {TARGET_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={target === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTarget(target === option.value ? undefined : option.value)}
                    disabled={isGenerating}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Non selectionne = auto-detecte
              </p>
            </div>

            {/* Domaine / Secteur */}
            <div className="space-y-2">
              <Label htmlFor="sector">Domaine / Secteur</Label>
              <Input
                id="sector"
                placeholder="Ex: Marketing digital, Management..."
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={isGenerating}
              />
              <div className="flex flex-wrap gap-2">
                {SECTOR_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    className={cn(
                      'px-2 py-1 rounded-full text-xs border transition-colors',
                      sector === suggestion
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:border-primary/50',
                      isGenerating && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => setSector(suggestion)}
                    disabled={isGenerating}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Niveau */}
            <div className="space-y-2">
              <Label>Niveau</Label>
              <div className="flex gap-2">
                {LEVEL_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={level === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLevel(level === option.value ? undefined : option.value)}
                    disabled={isGenerating}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Non selectionne = auto-detecte
              </p>
            </div>

            {/* Prerequis */}
            <div className="space-y-2">
              <Label htmlFor="prerequisites">Prerequis (optionnel)</Label>
              <textarea
                id="prerequisites"
                className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder="Connaissances requises pour suivre cette formation"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            {/* Style pedagogique */}
            <div className="space-y-2">
              <Label>Style pedagogique</Label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-colors',
                      style === option.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50',
                      isGenerating && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => setStyle(style === option.value ? undefined : option.value)}
                    disabled={isGenerating}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Non selectionne = style mixte par defaut
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 3 - Objectifs pedagogiques */}
      <div className="space-y-4">
        <button
          className="flex items-center gap-2 text-sm font-medium"
          onClick={() => setShowObjectives(!showObjectives)}
          disabled={isGenerating}
        >
          {showObjectives ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="text-muted-foreground uppercase tracking-wide">
            Objectifs pedagogiques ({objectives.length})
          </span>
        </button>

        {showObjectives && (
          <div className="space-y-3 pl-4 border-l-2">
            <p className="text-xs text-muted-foreground">
              Si vide, les objectifs seront generes automatiquement par l&apos;IA
            </p>

            {objectives.map((objective, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={objective} readOnly className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleRemoveObjective(index)}
                  disabled={isGenerating}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Input
                placeholder="Ajouter un objectif..."
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddObjective();
                  }
                }}
                disabled={isGenerating}
              />
              <Button size="sm" variant="outline" onClick={handleAddObjective} disabled={isGenerating}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          {isGenerating ? 'Fermer' : 'Annuler'}
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generation en cours...
            </>
          ) : (
            'Generer le Plan de cours'
          )}
        </Button>
      </div>
    </div>
  );
}
