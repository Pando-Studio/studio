'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Input,
} from '@/components/ui';
import { useSourceChunks } from '@/hooks/use-source-chunks';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { FileText, Search, Hash } from 'lucide-react';

interface SourcePreviewDrawerProps {
  studioId: string;
  source: {
    id: string;
    title: string;
    type: string;
    status: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  INDEXING: 'Indexation...',
  INDEXED: 'Pret',
  ERROR: 'Erreur',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  INDEXING: 'bg-blue-100 text-blue-800',
  INDEXED: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-100 text-red-800',
};

const typeLabels: Record<string, string> = {
  DOCUMENT: 'Document',
  WEB: 'Web',
  YOUTUBE: 'YouTube',
  WIDGET: 'Genere',
  AUDIO: 'Audio',
  VIDEO: 'Video',
};

export function SourcePreviewDrawer({
  studioId,
  source,
  open,
  onClose,
}: SourcePreviewDrawerProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading } = useSourceChunks(
    studioId,
    source?.id ?? null,
    {
      search: debouncedSearch || undefined,
      limit: 50,
    },
  );

  const chunks = data?.chunks ?? [];
  const total = data?.total ?? 0;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3">
          <div className="pr-8">
            <SheetTitle className="text-base truncate">
              {source?.title ?? 'Source'}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Contenu de la source {source?.title}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {source?.type && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {typeLabels[source.type] ?? source.type}
              </span>
            )}
            {source?.status && (
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                  statusColors[source.status] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {statusLabels[source.status] ?? source.status}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Hash className="h-3 w-3" />
              {total} chunk{total !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans le contenu..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </SheetHeader>

        {/* Chunks list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-4/5 bg-muted rounded" />
                    <div className="h-3 w-3/5 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : chunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? 'Aucun resultat pour cette recherche'
                  : 'Aucun contenu disponible'}
              </p>
              {debouncedSearch && (
                <button
                  className="text-xs text-primary mt-2 hover:underline"
                  onClick={() => setSearchInput('')}
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {chunks.map((chunk) => (
                <div key={chunk.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Chunk {chunk.chunkIndex + 1}
                    </span>
                    {chunk.pageNumber != null && (
                      <span className="text-xs text-muted-foreground/70">
                        - Page {chunk.pageNumber}
                      </span>
                    )}
                  </div>
                  <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-sans leading-relaxed">
                    {chunk.content}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
