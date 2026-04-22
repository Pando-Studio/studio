'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JSONContent } from '@tiptap/react';
import { Button, Input } from '@/components/ui';
import {
  ArrowLeft,
  Save,
  FileDown,
  Check,
  Edit,
  Loader2,
  Clock,
  Users,
  GraduationCap,
  BookOpen,
  Share2,
} from 'lucide-react';
import { CoursePlanEditor } from '@/components/course-plan/CoursePlanEditor';

interface CoursePlan {
  id: string;
  title: string;
  description: string | null;
  content: JSONContent;
  status: 'DRAFT' | 'PUBLISHED';
  metadata: {
    duration?: string;
    target?: string;
    level?: string;
    style?: string;
    objectives?: string[];
    sector?: string;
    prerequisites?: string;
  };
  createdAt: string;
  updatedAt: string;
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

export default function CoursePlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const studioId = params.id as string;
  const planId = params.planId as string;

  const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  useEffect(() => {
    if (studioId && planId) {
      fetchCoursePlan();
    }
  }, [studioId, planId]);

  const fetchCoursePlan = async () => {
    try {
      const response = await fetch(`/api/studios/${studioId}/course-plans/${planId}`);
      const data = await response.json();
      if (data.coursePlan) {
        setCoursePlan(data.coursePlan);
        setTitleInput(data.coursePlan.title);
      }
    } catch (error) {
      console.error('Error fetching course plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCoursePlan = useCallback(
    async (content: JSONContent) => {
      if (!coursePlan) return;

      setSaving(true);
      try {
        await fetch(`/api/studios/${studioId}/course-plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error saving course plan:', error);
      } finally {
        setSaving(false);
      }
    },
    [coursePlan, studioId, planId]
  );

  const updateTitle = async () => {
    if (!coursePlan || !titleInput.trim()) return;

    try {
      await fetch(`/api/studios/${studioId}/course-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      setCoursePlan({ ...coursePlan, title: titleInput.trim() });
      setEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const togglePublish = async () => {
    if (!coursePlan) return;

    const newStatus = coursePlan.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';

    try {
      await fetch(`/api/studios/${studioId}/course-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setCoursePlan({ ...coursePlan, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!coursePlan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Plan de cours introuvable</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/studios/${studioId}/course-plans`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux plans
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/studios/${studioId}/course-plans`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-64"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateTitle();
                  if (e.key === 'Escape') {
                    setEditingTitle(false);
                    setTitleInput(coursePlan.title);
                  }
                }}
              />
              <Button size="sm" onClick={updateTitle}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              {coursePlan.title}
            </h1>
          )}

          {/* Status badge */}
          {coursePlan.status === 'PUBLISHED' ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <Check className="h-3 w-3" />
              Publie
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              <Edit className="h-3 w-3" />
              Brouillon
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sauvegarde...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span>Sauvegarde a {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : null}
          </div>

          {/* Publish button */}
          <Button
            variant={coursePlan.status === 'PUBLISHED' ? 'outline' : 'default'}
            size="sm"
            onClick={togglePublish}
          >
            {coursePlan.status === 'PUBLISHED' ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Repasser en brouillon
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Publier
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Metadata bar */}
      <div className="flex items-center gap-6 px-4 py-2 border-b bg-muted/30 text-sm text-muted-foreground shrink-0">
        {coursePlan.metadata?.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {coursePlan.metadata.duration}h
          </span>
        )}
        {coursePlan.metadata?.target && (
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {TARGET_LABELS[coursePlan.metadata.target] || coursePlan.metadata.target}
          </span>
        )}
        {coursePlan.metadata?.level && (
          <span className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            {LEVEL_LABELS[coursePlan.metadata.level] || coursePlan.metadata.level}
          </span>
        )}
        {coursePlan.metadata?.objectives && coursePlan.metadata.objectives.length > 0 && (
          <span className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            {coursePlan.metadata.objectives.length} objectifs
          </span>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CoursePlanEditor
          content={coursePlan.content}
          onChange={(content) => setCoursePlan({ ...coursePlan, content })}
          onSave={saveCoursePlan}
          editable={true}
          autoSave={true}
          autoSaveDelay={2000}
          className="h-full"
        />
      </div>
    </div>
  );
}
