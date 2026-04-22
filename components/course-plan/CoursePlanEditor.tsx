'use client';

import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useCallback, useEffect, useState, useRef } from 'react';
import { EditorToolbar } from '../editor/EditorToolbar';
import { ActivityBlock, ActivityType, ActivityBlockConfig } from '../editor/extensions/ActivityBlock';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label } from '@/components/ui';
import { Plus, HelpCircle, Cloud, Users, Hammer, FileText, Save, Download, FileDown } from 'lucide-react';

interface CoursePlanEditorProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

const activityTypes: {
  type: ActivityType;
  label: string;
  icon: typeof HelpCircle;
  description: string;
}[] = [
  {
    type: 'quiz',
    label: 'Quiz',
    icon: HelpCircle,
    description: 'Questions pour evaluer les acquis',
  },
  {
    type: 'wordcloud',
    label: 'Nuage de mots',
    icon: Cloud,
    description: 'Brainstorming collaboratif',
  },
  {
    type: 'roleplay',
    label: 'Jeu de role',
    icon: Users,
    description: 'Mise en situation et simulation',
  },
  {
    type: 'workshop',
    label: 'Atelier',
    icon: Hammer,
    description: 'Travail pratique en groupe',
  },
  {
    type: 'exercise',
    label: 'Exercice',
    icon: FileText,
    description: 'Exercice individuel ou defi',
  },
];

export function CoursePlanEditor({
  content,
  onChange,
  onSave,
  editable = true,
  placeholder = 'Commencez a ecrire votre plan de cours...',
  className = '',
  autoSave = true,
  autoSaveDelay = 2000,
}: CoursePlanEditorProps) {
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState<{
    type: ActivityType;
    title: string;
    description: string;
    config: ActivityBlockConfig;
  }>({
    type: 'quiz',
    title: '',
    description: '',
    config: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      ActivityBlock,
    ],
    content: content || {
      type: 'doc',
      content: [],
    },
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange?.(json);

      // Auto-save with debounce
      if (autoSave && onSave) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        setIsSaving(true);
        saveTimeoutRef.current = setTimeout(() => {
          onSave(json);
          setIsSaving(false);
        }, autoSaveDelay);
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    // Not used for course plans, but required by EditorToolbar
  }, []);

  const insertActivity = useCallback(() => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'activityBlock',
      attrs: {
        activityType: newActivity.type,
        title: newActivity.title,
        description: newActivity.description,
        config: newActivity.config,
      },
    }).run();

    setIsActivityDialogOpen(false);
    setNewActivity({
      type: 'quiz',
      title: '',
      description: '',
      config: {},
    });
  }, [editor, newActivity]);

  const handleManualSave = useCallback(() => {
    if (editor && onSave) {
      onSave(editor.getJSON());
    }
  }, [editor, onSave]);

  const exportMarkdown = useCallback(() => {
    if (!editor) return;

    // Convert ProseMirror JSON to Markdown
    const json = editor.getJSON();
    let markdown = '';

    const processNode = (node: JSONContent, depth = 0): string => {
      let result = '';

      if (node.type === 'heading') {
        const level = (node.attrs?.level as number) || 1;
        const prefix = '#'.repeat(level);
        const text = node.content?.map((c) => c.text || '').join('') || '';
        result += `${prefix} ${text}\n\n`;
      } else if (node.type === 'paragraph') {
        const text = node.content?.map((c) => c.text || '').join('') || '';
        result += `${text}\n\n`;
      } else if (node.type === 'bulletList') {
        node.content?.forEach((item) => {
          const text = item.content?.[0]?.content?.map((c) => c.text || '').join('') || '';
          result += `- ${text}\n`;
        });
        result += '\n';
      } else if (node.type === 'orderedList') {
        node.content?.forEach((item, index) => {
          const text = item.content?.[0]?.content?.map((c) => c.text || '').join('') || '';
          result += `${index + 1}. ${text}\n`;
        });
        result += '\n';
      } else if (node.type === 'activityBlock') {
        const type = node.attrs?.activityType || 'activity';
        const title = node.attrs?.title || 'Activite';
        const description = node.attrs?.description || '';
        result += `> **[${type.toUpperCase()}]** ${title}\n`;
        if (description) {
          result += `> ${description}\n`;
        }
        result += '\n';
      } else if (node.type === 'doc' && node.content) {
        node.content.forEach((child) => {
          result += processNode(child, depth);
        });
      }

      return result;
    };

    markdown = processNode(json);

    // Download the markdown file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plan-de-cours.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      {editable && (
        <div className="border-b bg-muted/30">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <EditorToolbar editor={editor} onSetLink={setLink} onAddImage={addImage} />
              <div className="mx-2 h-6 w-px bg-border" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsActivityDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter une activite
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-muted-foreground">Sauvegarde...</span>
              )}
              <Button variant="ghost" size="sm" onClick={exportMarkdown} className="gap-2">
                <FileDown className="h-4 w-4" />
                Export MD
              </Button>
              {onSave && (
                <Button variant="outline" size="sm" onClick={handleManualSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Sauvegarder
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajouter une activite</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Activity Type Selection */}
            <div className="space-y-2">
              <Label>Type d&apos;activite</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activityTypes.map(({ type, label, icon: Icon, description }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewActivity((prev) => ({ ...prev, type }))}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors hover:bg-muted ${
                      newActivity.type === type
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="activity-title">Titre</Label>
              <Input
                id="activity-title"
                value={newActivity.title}
                onChange={(e) =>
                  setNewActivity((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ex: Evaluation des acquis"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="activity-description">Description</Label>
              <Input
                id="activity-description"
                value={newActivity.description}
                onChange={(e) =>
                  setNewActivity((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Ex: Quiz de 5 questions sur les concepts cles"
              />
            </div>

            {/* Type-specific config */}
            {newActivity.type === 'quiz' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="question-count">Nombre de questions</Label>
                  <Input
                    id="question-count"
                    type="number"
                    min={1}
                    max={20}
                    value={newActivity.config.questionCount || 5}
                    onChange={(e) =>
                      setNewActivity((prev) => ({
                        ...prev,
                        config: { ...prev.config, questionCount: parseInt(e.target.value) || 5 },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulte</Label>
                  <select
                    id="difficulty"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={newActivity.config.difficulty || 'medium'}
                    onChange={(e) =>
                      setNewActivity((prev) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                        },
                      }))
                    }
                  >
                    <option value="easy">Facile</option>
                    <option value="medium">Moyen</option>
                    <option value="hard">Difficile</option>
                  </select>
                </div>
              </div>
            )}

            {newActivity.type === 'workshop' && (
              <div className="space-y-2">
                <Label htmlFor="group-size">Taille des groupes</Label>
                <Input
                  id="group-size"
                  type="number"
                  min={2}
                  max={10}
                  value={newActivity.config.groupSize || 4}
                  onChange={(e) =>
                    setNewActivity((prev) => ({
                      ...prev,
                      config: { ...prev.config, groupSize: parseInt(e.target.value) || 4 },
                    }))
                  }
                />
              </div>
            )}

            {(newActivity.type === 'exercise' || newActivity.type === 'roleplay') && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duree suggeree</Label>
                <Input
                  id="duration"
                  value={newActivity.config.duration || ''}
                  onChange={(e) =>
                    setNewActivity((prev) => ({
                      ...prev,
                      config: { ...prev.config, duration: e.target.value },
                    }))
                  }
                  placeholder="Ex: 15 minutes"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={insertActivity} disabled={!newActivity.title}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
