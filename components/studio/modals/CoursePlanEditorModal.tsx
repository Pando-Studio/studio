'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { CoursePlanEditor } from '@/components/course-plan/CoursePlanEditor';
import { JSONContent } from '@tiptap/core';
import { Loader2 } from 'lucide-react';

interface CoursePlanData {
  id: string;
  title: string;
  description?: string;
  content?: JSONContent;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface CoursePlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  coursePlanId: string;
  studioId: string;
}

export function CoursePlanEditorModal({
  isOpen,
  onClose,
  coursePlanId,
  studioId,
}: CoursePlanEditorModalProps) {
  const [coursePlan, setCoursePlan] = useState<CoursePlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && coursePlanId) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/studios/${studioId}/course-plans/${coursePlanId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch course plan');
          return res.json();
        })
        .then((data) => {
          setCoursePlan(data.coursePlan);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
        });
    }
  }, [isOpen, coursePlanId, studioId]);

  const handleSave = useCallback(
    async (content: JSONContent) => {
      try {
        const response = await fetch(
          `/api/studios/${studioId}/course-plans/${coursePlanId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          }
        );
        if (!response.ok) {
          throw new Error('Failed to save course plan');
        }
      } catch (err) {
        console.error('Error saving course plan:', err);
      }
    },
    [studioId, coursePlanId]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{coursePlan?.title || 'Plan de cours'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-12">{error}</p>
          ) : coursePlan ? (
            <CoursePlanEditor
              content={coursePlan.content}
              onSave={handleSave}
              autoSave={true}
            />
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Plan de cours introuvable
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
