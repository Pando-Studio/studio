'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { useStudio } from './context/StudioContext';
import {
  ArrowLeft,
  Settings,
  Play,
  Check,
  X,
  Pencil,
  Loader2,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShareDialog } from './ShareDialog';

export function StudioHeader() {
  const { studio, runs, updateStudioTitle } = useStudio();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeRunsCount = runs.filter(
    (r) => r.status === 'PENDING' || r.status === 'RUNNING'
  ).length;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditedTitle(studio?.title || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle('');
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim() || editedTitle === studio?.title) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      await updateStudioTitle(editedTitle.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update title:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="flex items-center justify-between h-[52px] px-4 bg-white border-b border-gray-200">
      {/* Left section: Back button + Title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={editedTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 w-64 text-lg font-semibold"
              disabled={isSaving}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-2 group"
          >
            <h1 className="text-lg font-semibold">{studio?.title || 'Studio'}</h1>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Right section: Runs badge + Settings */}
      <div className="flex items-center gap-2">
        {/* Active runs indicator */}
        {activeRunsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 rounded-full">
            <Play className="h-3.5 w-3.5 text-yellow-700 animate-pulse" />
            <span className="text-sm font-medium text-yellow-700">
              {activeRunsCount} en cours
            </span>
          </div>
        )}

        {/* Share button */}
        {studio?.id && <ShareDialog studioId={studio.id} />}

        {/* Live Qiplim button */}
        <a href="https://qiplim.com" target="_blank" rel="noopener noreferrer">
          <Button
            variant="default"
            size="sm"
          >
            <Radio className="h-4 w-4 mr-2" />
            Live Qiplim
          </Button>
        </a>

        {/* Settings button */}
        <Link href={`/settings/providers?studio=${studio?.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

    </div>
  );
}
