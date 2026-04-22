'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2, Settings, FileText, Image, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresentationGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

type TextQuantity = 'minimal' | 'balanced' | 'detailed';
type ImageSource = 'ai' | 'unsplash' | 'none';
type TabType = 'params' | 'content' | 'images' | 'theme';

const TONE_SUGGESTIONS = [
  'Professionnel',
  'Pedagogique',
  'Commercial',
  'Formel',
  'Decontracte',
  'Humoristique',
  'Inspirant',
  'Technique',
];

const IMAGE_STYLES = [
  'Realiste',
  'Illustration',
  'Minimaliste',
  'Corporate',
  'Artistique',
  'Infographie',
];

const IMAGE_MODELS = [
  { id: 'gpt-image-1', name: 'GPT Image' },
  { id: 'gemini-2.5-flash', name: 'Gemini Flash' },
  { id: 'imagen-4', name: 'Imagen 4' },
];

const THEMES = [
  { id: 'light', name: 'Clair', description: 'Professionnel et epure', color: 'bg-white border' },
  { id: 'dark', name: 'Sombre', description: 'Moderne et elegant', color: 'bg-gray-900' },
  { id: 'corporate', name: 'Corporate', description: 'Bleu professionnel', color: 'bg-blue-600' },
  { id: 'creative', name: 'Creatif', description: 'Colore et dynamique', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'minimal', name: 'Minimal', description: 'Epure et elegant', color: 'bg-gray-100 border' },
];

export function PresentationGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: PresentationGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('params');

  // Params
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  // Content
  const [textQuantity, setTextQuantity] = useState<TextQuantity>('balanced');
  const [tone, setTone] = useState('');

  // Images
  const [imageSource, setImageSource] = useState<ImageSource>('ai');
  const [imageStyle, setImageStyle] = useState('Realiste');
  const [imageModel, setImageModel] = useState('gpt-image-1');

  // Theme
  const [themeId, setThemeId] = useState('light');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/generate/presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || undefined,
          description: description || undefined,
          instructions: instructions || undefined,
          textQuantity,
          tone: tone || undefined,
          imageSource,
          imageStyle: imageSource === 'ai' ? imageStyle : undefined,
          imageModel: imageSource === 'ai' ? imageModel : undefined,
          themeId,
          sourceIds: Array.from(selectedSourceIds),
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la generation');
      }

      onGenerated();
      onClose();
    } catch (error) {
      console.error('Error generating presentation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    { id: 'params' as const, label: 'Parametres', icon: Settings },
    { id: 'content' as const, label: 'Contenu', icon: FileText },
    { id: 'images' as const, label: 'Images', icon: Image },
    { id: 'theme' as const, label: 'Theme', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Tab 1 - Parametres */}
        {activeTab === 'params' && (
          <div className="space-y-4">
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
              <Label htmlFor="description">Description (optionnelle)</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Sera generee automatiquement"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions personnalisees</Label>
              <textarea
                id="instructions"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Precisez vos attentes pour la presentation..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Tab 2 - Contenu */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Quantite de texte</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'minimal' as const, label: 'Concis', desc: 'Slides epurees, mots-cles' },
                  { id: 'balanced' as const, label: 'Normal', desc: 'Equilibre texte/visuel' },
                  { id: 'detailed' as const, label: 'Detaille', desc: 'Contenu riche et complet' },
                ].map((option) => (
                  <button
                    key={option.id}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      textQuantity === option.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    )}
                    onClick={() => setTextQuantity(option.id)}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="tone">Ton</Label>
              <Input
                id="tone"
                placeholder="Ex: Professionnel, Pedagogique..."
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {TONE_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs border transition-colors',
                      tone === suggestion
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => setTone(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3 - Images */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Source des images</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'ai' as const, label: 'IA', desc: 'Images generees par IA' },
                  { id: 'unsplash' as const, label: 'Unsplash', desc: 'Photos libres de droits' },
                  { id: 'none' as const, label: 'Aucune', desc: 'Pas d\'images' },
                ].map((option) => (
                  <button
                    key={option.id}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      imageSource === option.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    )}
                    onClick={() => setImageSource(option.id)}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {imageSource === 'ai' && (
              <>
                <div className="space-y-3">
                  <Label>Style des images</Label>
                  <div className="flex flex-wrap gap-2">
                    {IMAGE_STYLES.map((style) => (
                      <button
                        key={style}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                          imageStyle === style
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:border-primary/50'
                        )}
                        onClick={() => setImageStyle(style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Modele IA</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {IMAGE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        className={cn(
                          'p-3 rounded-lg border text-center transition-colors',
                          imageModel === model.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        )}
                        onClick={() => setImageModel(model.id)}
                      >
                        <div className="font-medium text-sm">{model.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 4 - Theme */}
        {activeTab === 'theme' && (
          <div className="space-y-4">
            <Label>Theme de la presentation</Label>
            <div className="grid grid-cols-2 gap-4">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-colors',
                    themeId === theme.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:border-muted-foreground/50'
                  )}
                  onClick={() => setThemeId(theme.id)}
                >
                  <div
                    className={cn(
                      'w-full h-16 rounded-md mb-3',
                      theme.color
                    )}
                  />
                  <div className="font-medium text-sm">{theme.name}</div>
                  <div className="text-xs text-muted-foreground">{theme.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          Annuler
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generation en cours...
            </>
          ) : (
            'Generer la Presentation'
          )}
        </Button>
      </div>
    </div>
  );
}
