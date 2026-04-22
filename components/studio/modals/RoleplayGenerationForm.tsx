'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import { Loader2, Plus, Trash2, Copy, Edit2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleplayGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

interface RoleplayAgent {
  id: string;
  name: string;
  context: string;
  behavior: string;
  objectives: string[];
  evaluationCriteria: string[];
  systemPrompt?: string;
}

type Mode = 'individual' | 'group';

const EVALUATION_CRITERIA_SUGGESTIONS = [
  'Ecoute active',
  'Gestion des objections',
  'Clarte de communication',
  'Empathie',
  'Argumentation',
  'Negociation',
  'Gestion du stress',
  'Reformulation',
  'Prise de decision',
];

export function RoleplayGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: RoleplayGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Basic info
  const [title, setTitle] = useState('');
  const [scenario, setScenario] = useState('');
  const [instructions, setInstructions] = useState('');
  const [mode, setMode] = useState<Mode>('individual');

  // Agents
  const [agents, setAgents] = useState<RoleplayAgent[]>([]);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<RoleplayAgent | null>(null);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiModel, setAiModel] = useState('mistral-medium');
  const [temperature, setTemperature] = useState(0.7);
  const [maxDuration, setMaxDuration] = useState<number | undefined>(undefined);
  const [recordConversations, setRecordConversations] = useState(true);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/roleplay-conversation',
          title: title || 'Jeu de role sans titre',
          description: scenario || undefined,
          inputs: {
            roleCount: agents.length > 0 ? agents.length : 2,
            scenario: scenario || undefined,
            personality: 'neutral',
            instructions: instructions || undefined,
            mode,
            agents,
            maxDuration,
            recordConversations,
          },
          sourceIds: Array.from(selectedSourceIds),
          language: 'fr',
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la generation');
      }

      onGenerated();
      onClose();
    } catch (error) {
      console.error('Error generating roleplay:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddAgent = () => {
    setEditingAgent({
      id: `agent-${Date.now()}`,
      name: '',
      context: '',
      behavior: '',
      objectives: [],
      evaluationCriteria: [],
      systemPrompt: '',
    });
    setIsAgentModalOpen(true);
  };

  const handleEditAgent = (agent: RoleplayAgent) => {
    setEditingAgent({ ...agent });
    setIsAgentModalOpen(true);
  };

  const handleDuplicateAgent = (agent: RoleplayAgent) => {
    const duplicate: RoleplayAgent = {
      ...agent,
      id: `agent-${Date.now()}`,
      name: `${agent.name} (copie)`,
    };
    setAgents([...agents, duplicate]);
  };

  const handleDeleteAgent = (agentId: string) => {
    setAgents(agents.filter((a) => a.id !== agentId));
  };

  const handleSaveAgent = (agent: RoleplayAgent) => {
    const existingIndex = agents.findIndex((a) => a.id === agent.id);
    if (existingIndex >= 0) {
      const updated = [...agents];
      updated[existingIndex] = agent;
      setAgents(updated);
    } else {
      setAgents([...agents, agent]);
    }
    setIsAgentModalOpen(false);
    setEditingAgent(null);
  };

  return (
    <div className="space-y-6">
      {/* Section 1 - Scenario global */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Scenario global
        </h3>

        <div className="space-y-2">
          <Label htmlFor="title">Titre (optionnel)</Label>
          <Input
            id="title"
            placeholder="Sera genere automatiquement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scenario">Scenario</Label>
          <textarea
            id="scenario"
            className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Decrivez la situation de jeu de role..."
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions personnalisees</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Precisez vos attentes..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Mode</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={mode === 'individual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('individual')}
            >
              Individuel
            </Button>
            <Button
              type="button"
              variant={mode === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('group')}
            >
              Groupe
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2 - Agents IA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Agents IA ({agents.length})
          </h3>
          <Button size="sm" variant="outline" onClick={handleAddAgent}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un personnage
          </Button>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-8 border rounded-lg border-dashed">
            <p className="text-muted-foreground text-sm mb-3">
              Aucun personnage configure
            </p>
            <Button size="sm" onClick={handleAddAgent}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un personnage
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{agent.name || 'Sans nom'}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {agent.context || 'Pas de contexte'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditAgent(agent)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDuplicateAgent(agent)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3 - Parametres avances */}
      <div className="space-y-4">
        <button
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Parametres avances
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2">
            <div className="space-y-2">
              <Label>Modele IA</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={aiModel === 'mistral-medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAiModel('mistral-medium')}
                >
                  Mistral Medium
                </Button>
                <Button
                  type="button"
                  variant={aiModel === 'mistral-large' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAiModel('mistral-large')}
                >
                  Mistral Large
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Temperature: {temperature}</Label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Plus la valeur est elevee, plus les reponses sont creatives
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDuration">Duree max (minutes, optionnel)</Label>
              <Input
                id="maxDuration"
                type="number"
                min={1}
                max={120}
                placeholder="Pas de limite"
                value={maxDuration || ''}
                onChange={(e) => setMaxDuration(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recordConversations}
                onChange={(e) => setRecordConversations(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">Enregistrer les conversations</span>
            </label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          Annuler
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating || agents.length === 0}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creation en cours...
            </>
          ) : (
            'Creer le Roleplay'
          )}
        </Button>
      </div>

      {/* Agent Configuration Modal */}
      <AgentConfigModal
        isOpen={isAgentModalOpen}
        onClose={() => {
          setIsAgentModalOpen(false);
          setEditingAgent(null);
        }}
        agent={editingAgent}
        onSave={handleSaveAgent}
      />
    </div>
  );
}

// Agent Configuration Modal Component
interface AgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: RoleplayAgent | null;
  onSave: (agent: RoleplayAgent) => void;
}

function AgentConfigModal({ isOpen, onClose, agent, onSave }: AgentConfigModalProps) {
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [behavior, setBehavior] = useState('');
  const [objectivesText, setObjectivesText] = useState('');
  const [selectedCriteria, setSelectedCriteria] = useState<Set<string>>(new Set());
  const [customCriteria, setCustomCriteria] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  // Reset form when agent changes
  useState(() => {
    if (agent) {
      setName(agent.name);
      setContext(agent.context);
      setBehavior(agent.behavior);
      setObjectivesText(agent.objectives.join('\n'));
      setSelectedCriteria(new Set(agent.evaluationCriteria));
      setSystemPrompt(agent.systemPrompt || '');
    } else {
      setName('');
      setContext('');
      setBehavior('');
      setObjectivesText('');
      setSelectedCriteria(new Set());
      setSystemPrompt('');
    }
  });

  // Update form when agent changes
  if (agent && name !== agent.name && !name) {
    setName(agent.name);
    setContext(agent.context);
    setBehavior(agent.behavior);
    setObjectivesText(agent.objectives.join('\n'));
    setSelectedCriteria(new Set(agent.evaluationCriteria));
    setSystemPrompt(agent.systemPrompt || '');
  }

  const handleSave = () => {
    if (!agent) return;

    const objectives = objectivesText
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    const allCriteria = [...selectedCriteria];
    if (customCriteria.trim()) {
      allCriteria.push(customCriteria.trim());
    }

    onSave({
      ...agent,
      name,
      context,
      behavior,
      objectives,
      evaluationCriteria: allCriteria,
      systemPrompt: systemPrompt || undefined,
    });
  };

  const toggleCriteria = (criteria: string) => {
    const next = new Set(selectedCriteria);
    if (next.has(criteria)) {
      next.delete(criteria);
    } else {
      next.add(criteria);
    }
    setSelectedCriteria(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agent?.name ? `Modifier: ${agent.name}` : 'Nouveau personnage'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Nom du personnage *</Label>
            <Input
              id="agentName"
              placeholder="Ex: M. Durand, Directrice RH..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentContext">Qui est ce personnage ?</Label>
            <textarea
              id="agentContext"
              className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Decrivez son role, sa situation, son background..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentBehavior">Comment reagit-il ?</Label>
            <textarea
              id="agentBehavior"
              className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Decrivez ses reactions typiques, son attitude..."
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectives">Objectifs pour l&apos;apprenant</Label>
            <textarea
              id="objectives"
              className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Un objectif par ligne..."
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Criteres d&apos;evaluation</Label>
            <div className="flex flex-wrap gap-2">
              {EVALUATION_CRITERIA_SUGGESTIONS.map((criteria) => (
                <button
                  key={criteria}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs border transition-colors',
                    selectedCriteria.has(criteria)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-primary/50'
                  )}
                  onClick={() => toggleCriteria(criteria)}
                >
                  {criteria}
                  {selectedCriteria.has(criteria) && (
                    <X className="h-3 w-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
            <Input
              placeholder="Ajouter un critere personnalise..."
              value={customCriteria}
              onChange={(e) => setCustomCriteria(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            >
              {showSystemPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Avance: Prompt systeme
            </button>
            {showSystemPrompt && (
              <textarea
                className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Laissez vide pour generation automatique..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
