'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button, Input } from '@/components/ui';
import { useSources, usePanels, useStudio, StudioSource } from '../context/StudioContext';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Globe,
  Youtube,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Mic,
  Video,
  Upload,
  Search,
  X,
  Tag,
  CloudDownload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/keys';
import { SelectDocumentsModal } from '../modals/SelectDocumentsModal';
import { GoogleDrivePickerModal } from '../GoogleDrivePickerModal';
import { SourcePreviewDrawer } from '../SourcePreviewDrawer';
import { useCitationNavigation } from '@/lib/stores/citation-navigation';
import { toast } from 'sonner';
import { useTags } from '@/hooks/use-tags';
import { TagPicker } from '../TagPicker';
import { useSourceSearch } from '@/hooks/use-source-search';
import { useDebounce } from '@/hooks/useDebounce';

interface UploadingFile {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

const sourceTypeIcons: Record<StudioSource['type'], React.ComponentType<{ className?: string }>> = {
  DOCUMENT: FileText,
  WEB: Globe,
  YOUTUBE: Youtube,
  WIDGET: Sparkles,
  AUDIO: Mic,
  VIDEO: Video,
};

const sourceTypeLabels: Record<StudioSource['type'], string> = {
  DOCUMENT: 'Documents',
  WEB: 'Web',
  YOUTUBE: 'YouTube',
  WIDGET: 'Contenu genere',
  AUDIO: 'Audio',
  VIDEO: 'Video',
};

const statusConfig: Record<
  StudioSource['status'],
  { colorClass: string; label: string }
> = {
  PENDING: { colorClass: 'text-yellow-500', label: 'En attente...' },
  INDEXING: { colorClass: 'text-blue-500', label: 'Indexation...' },
  INDEXED: { colorClass: 'text-green-500', label: 'Indexe' },
  ERROR: { colorClass: 'text-red-500', label: 'Erreur' },
};

function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  if (!query) return <span>{snippet}</span>;

  const lowerSnippet = snippet.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  let idx = lowerSnippet.indexOf(lowerQuery);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push({ text: snippet.slice(lastIndex, idx), highlight: false });
    }
    parts.push({ text: snippet.slice(idx, idx + query.length), highlight: true });
    lastIndex = idx + query.length;
    idx = lowerSnippet.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < snippet.length) {
    parts.push({ text: snippet.slice(lastIndex), highlight: false });
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export function SourcesPanel() {
  const { studio, refreshStudio, canEdit, isViewer } = useStudio();
  const {
    sources,
    selectedSourceIds,
    toggleSourceSelection,
    selectAllSources,
    deselectAllSources,
  } = useSources();
  const { isSourcesPanelCollapsed, toggleSourcesPanel } = usePanels();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [previewSource, setPreviewSource] = useState<StudioSource | null>(null);
  const queryClient = useQueryClient();
  const { highlightedSourceId, clearHighlight } = useCitationNavigation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // --- Tag filter state ---
  const { data: allTags = [] } = useTags();
  const [activeTagFilterIds, setActiveTagFilterIds] = useState<Set<string>>(new Set());

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const isSearching = debouncedQuery.length >= 2;
  const { data: searchResults = [], isLoading: isSearchLoading } = useSourceSearch(
    studio?.id ?? '',
    debouncedQuery,
  );

  // --- Drag & drop handlers ---

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the panel (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      if (!studio) return;

      const newUploads: UploadingFile[] = files.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        status: 'uploading' as const,
      }));
      setUploadingFiles((prev) => [...prev, ...newUploads]);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadId = newUploads[i].id;

        try {
          // Upload file via /api/documents/upload (multipart FormData)
          const formData = new FormData();
          formData.append('file', file);
          formData.append('source', 'LOCAL');
          formData.append('studioId', studio.id);

          const uploadRes = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(
              (errData as { error?: string }).error || 'Upload echoue'
            );
          }

          // Mark as processing (indexation queued server-side)
          setUploadingFiles((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: 'processing' } : u
            )
          );

          // Brief pause to let the server queue settle before marking done
          await new Promise((resolve) => setTimeout(resolve, 500));

          setUploadingFiles((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: 'done' } : u
            )
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Upload echoue';
          setUploadingFiles((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? { ...u, status: 'error', error: message }
                : u
            )
          );
          toast.error(`Erreur: ${file.name}`, { description: message });
        }
      }

      // Refresh sources list
      queryClient.invalidateQueries({
        queryKey: queryKeys.studios.detail(studio.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sources.byStudio(studio.id),
      });

      // Clear completed uploads after 3 seconds
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((u) => u.status !== 'done'));
      }, 3000);
    },
    [studio, queryClient]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await handleFilesUpload(files);
      }
    },
    [handleFilesUpload]
  );

  // Auto-open preview drawer when a citation is clicked
  useEffect(() => {
    if (highlightedSourceId) {
      const source = sources.find((s) => s.id === highlightedSourceId);
      if (source) {
        setPreviewSource(source);
      }
      clearHighlight();
    }
  }, [highlightedSourceId, sources, clearHighlight]);

  const handleSourcesAdded = () => {
    refreshStudio();
  };

  const handleRetry = useCallback(
    async (e: React.MouseEvent, sourceId: string) => {
      e.stopPropagation(); // Prevent toggling selection
      if (!studio) return;

      setRetryingIds((prev) => new Set(prev).add(sourceId));
      try {
        await fetch(`/api/studios/${studio.id}/sources/${sourceId}/retry`, {
          method: 'POST',
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.studios.detail(studio.id),
        });
      } finally {
        setRetryingIds((prev) => {
          const next = new Set(prev);
          next.delete(sourceId);
          return next;
        });
      }
    },
    [studio, queryClient]
  );

  const handleTagsChanged = useCallback(() => {
    if (!studio) return;
    queryClient.invalidateQueries({
      queryKey: queryKeys.studios.detail(studio.id),
    });
  }, [studio, queryClient]);

  const toggleTagFilter = useCallback((tagId: string) => {
    setActiveTagFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  // Filter sources by active tags
  const filteredSources = useMemo(() => {
    if (activeTagFilterIds.size === 0) return sources;
    return sources.filter((source) => {
      const sourceTagIds = (source.tags ?? []).map((t) => t.tag.id);
      return Array.from(activeTagFilterIds).some((id) => sourceTagIds.includes(id));
    });
  }, [sources, activeTagFilterIds]);

  // Group sources by type
  const groupedSources = useMemo(() => {
    return filteredSources.reduce(
      (acc, source) => {
        if (!acc[source.type]) {
          acc[source.type] = [];
        }
        acc[source.type].push(source);
        return acc;
      },
      {} as Record<StudioSource['type'], StudioSource[]>,
    );
  }, [filteredSources]);

  // Tags that are actually used on current sources (for filter chips)
  const usedTags = useMemo(() => {
    const usedTagIds = new Set<string>();
    for (const source of sources) {
      for (const st of source.tags ?? []) {
        usedTagIds.add(st.tag.id);
      }
    }
    return allTags.filter((t) => usedTagIds.has(t.id));
  }, [sources, allTags]);

  const allSelected = filteredSources.length > 0 && selectedSourceIds.size === filteredSources.length;
  const someSelected = selectedSourceIds.size > 0 && selectedSourceIds.size < filteredSources.length;

  // Collapsed view
  if (isSourcesPanelCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mb-4"
          onClick={toggleSourcesPanel}
          title="Afficher les sources"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-2">
          <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center" title="Sources">
            <FileText className="h-4 w-4 text-yellow-600" />
          </div>
          {selectedSourceIds.size > 0 && (
            <span className="text-xs font-medium text-center">{selectedSourceIds.size}</span>
          )}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      className="h-full flex flex-col relative"
      onDragOver={canEdit ? handleDragOver : undefined}
      onDragLeave={canEdit ? handleDragLeave : undefined}
      onDrop={canEdit ? handleDrop : undefined}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">
              Deposer les fichiers ici
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Sources</h2>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            {filteredSources.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleSourcesPanel}
            title="Masquer les sources"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tag filter chips */}
      {usedTags.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 overflow-x-auto">
          <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          {usedTags.map((tag) => {
            const isActive = activeTagFilterIds.has(tag.id);
            return (
              <button
                key={tag.id}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
                onClick={() => toggleTagFilter(tag.id)}
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
                {isActive && <X className="h-2.5 w-2.5 ml-0.5" />}
              </button>
            );
          })}
          {activeTagFilterIds.size > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ml-1"
              onClick={() => setActiveTagFilterIds(new Set())}
            >
              Effacer
            </button>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-7 pl-7 pr-7 text-xs"
            placeholder="Rechercher dans les sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Select all / Add source */}
      {!isSearching && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={allSelected ? deselectAllSources : selectAllSources}
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : someSelected ? (
              <div className="h-4 w-4 border-2 border-primary rounded bg-primary/20" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>{allSelected ? 'Tout deselectionner' : 'Tout selectionner'}</span>
          </button>
          {canEdit && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                title="Importer depuis Google Drive"
                onClick={() => setIsDrivePickerOpen(true)}
              >
                <CloudDownload className="h-3.5 w-3.5 mr-1" />
                Drive
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload progress */}
      {uploadingFiles.length > 0 && (
        <div className="px-3 py-2 space-y-1 border-b border-gray-200">
          {uploadingFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-sm">
              {f.status === 'uploading' && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 flex-shrink-0" />
              )}
              {f.status === 'processing' && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 flex-shrink-0" />
              )}
              {f.status === 'done' && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              )}
              {f.status === 'error' && (
                <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              )}
              <span className="truncate flex-1">{f.name}</span>
              {f.status === 'uploading' && (
                <span className="text-xs text-muted-foreground">Upload...</span>
              )}
              {f.status === 'processing' && (
                <span className="text-xs text-muted-foreground">
                  Indexation...
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sources list / Search results */}
      <div className="flex-1 overflow-y-auto p-2">
        {isSearching ? (
          // --- Search results mode ---
          <div className="space-y-2">
            {isSearchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun resultat pour &quot;{debouncedQuery}&quot;</p>
              </div>
            ) : (
              searchResults.map((result) => {
                const source = sources.find((s) => s.id === result.sourceId);
                const TypeIcon = sourceTypeIcons[result.sourceType as StudioSource['type']] ?? FileText;

                return (
                  <div
                    key={result.sourceId}
                    className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-background cursor-pointer transition-colors"
                    onClick={() => {
                      if (source) {
                        setPreviewSource(source);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{result.sourceTitle}</span>
                    </div>
                    <div className="space-y-1">
                      {result.matches.map((match) => (
                        <p key={match.chunkId} className="text-xs text-muted-foreground leading-relaxed">
                          <HighlightedSnippet snippet={match.snippet} query={debouncedQuery} />
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : filteredSources.length === 0 ? (
          // --- Empty state ---
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {activeTagFilterIds.size > 0 ? (
              <>
                <Tag className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Aucune source avec ces tags</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTagFilterIds(new Set())}
                >
                  Effacer les filtres
                </Button>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Aucune source</p>
                <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une source
                </Button>
              </>
            )}
          </div>
        ) : (
          // --- Normal source list ---
          <div className="space-y-4">
            {(Object.keys(groupedSources) as StudioSource['type'][]).map((type) => {
              const TypeIcon = sourceTypeIcons[type];
              const typeLabel = sourceTypeLabels[type];
              const typeSources = groupedSources[type];

              return (
                <div key={type}>
                  {/* Type header */}
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {typeLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({typeSources.length})
                    </span>
                  </div>

                  {/* Sources for this type */}
                  <div className="space-y-1">
                    {typeSources.map((source) => {
                      const isSelected = selectedSourceIds.has(source.id);
                      const { colorClass, label } = statusConfig[source.status];
                      const chunkCount = source._count?.chunks;
                      const sourceTagIds = (source.tags ?? []).map((t) => t.tag.id);

                      return (
                        <div
                          key={source.id}
                          className={cn(
                            'group/source flex flex-col gap-1 p-2 rounded-lg cursor-pointer transition-colors',
                            'hover:bg-background',
                            isSelected && 'bg-yellow-50/50'
                          )}
                          onClick={() => toggleSourceSelection(source.id)}
                        >
                          <div className="flex items-center gap-2">
                            {/* Checkbox */}
                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>

                            {/* Source info */}
                            <div className="flex-1 min-w-0">
                              <button
                                type="button"
                                className="text-sm font-medium truncate block w-full text-left hover:text-primary hover:underline transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewSource(source);
                                }}
                                title="Voir le contenu"
                              >
                                {source.title}
                              </button>
                              <div className="flex items-center gap-1.5">
                                {/* Status icon */}
                                {source.status === 'PENDING' && (
                                  <span className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                                )}
                                {source.status === 'INDEXING' && (
                                  <Loader2 className="h-3 w-3 text-blue-500 animate-spin flex-shrink-0" />
                                )}
                                {source.status === 'INDEXED' && (
                                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                )}
                                {source.status === 'ERROR' && (
                                  <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                )}

                                {/* Status text */}
                                <span className={cn('text-xs', colorClass)}>
                                  {source.status === 'INDEXED' && chunkCount != null
                                    ? `${label} (${chunkCount} chunks)`
                                    : label}
                                </span>
                              </div>
                            </div>

                            {/* Tag picker button */}
                            <TagPicker
                              sourceId={source.id}
                              sourceTags={sourceTagIds}
                              onTagsChanged={handleTagsChanged}
                            />

                            {/* Retry button for ERROR sources */}
                            {source.status === 'ERROR' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                title="Relancer l'indexation"
                                disabled={retryingIds.has(source.id)}
                                onClick={(e) => handleRetry(e, source.id)}
                              >
                                <RotateCw
                                  className={cn(
                                    'h-3.5 w-3.5 text-muted-foreground',
                                    retryingIds.has(source.id) && 'animate-spin'
                                  )}
                                />
                              </Button>
                            )}
                          </div>

                          {/* Tag badges */}
                          {(source.tags ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-6">
                              {(source.tags ?? []).map((st) => (
                                <span
                                  key={st.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-muted"
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: st.tag.color }}
                                  />
                                  {st.tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Progress bar for INDEXING sources */}
                          {source.status === 'INDEXING' && (
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden ml-6">
                              <div
                                className="h-full bg-blue-500 rounded-full animate-pulse"
                                style={{ width: '60%' }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Sources Modal */}
      {studio && (
        <SelectDocumentsModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          studioId={studio.id}
          onSourcesAdded={handleSourcesAdded}
        />
      )}

      {/* Google Drive Picker Modal */}
      {studio && (
        <GoogleDrivePickerModal
          isOpen={isDrivePickerOpen}
          onClose={() => setIsDrivePickerOpen(false)}
          studioId={studio.id}
          onImportComplete={() => {
            handleSourcesAdded();
            queryClient.invalidateQueries({
              queryKey: queryKeys.sources.byStudio(studio.id),
            });
          }}
        />
      )}

      {/* Source Content Preview Drawer */}
      {studio && (
        <SourcePreviewDrawer
          studioId={studio.id}
          source={previewSource}
          open={!!previewSource}
          onClose={() => setPreviewSource(null)}
        />
      )}
    </div>
  );
}
