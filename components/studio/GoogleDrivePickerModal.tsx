'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/components/ui';
import {
  Folder,
  FileText,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  iconLink?: string;
  webViewLink?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  onImportComplete: () => void;
}

type ImportStatus = 'idle' | 'importing' | 'done' | 'error';

interface FileImportState {
  fileId: string;
  status: ImportStatus;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOLDER_MIME = 'application/vnd.google-apps.folder';

const MIME_LABELS: Record<string, string> = {
  'application/vnd.google-apps.document': 'Google Docs',
  'application/vnd.google-apps.spreadsheet': 'Google Sheets',
  'application/vnd.google-apps.presentation': 'Google Slides',
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'text/plain': 'Texte',
  'text/markdown': 'Markdown',
  'text/csv': 'CSV',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoogleDrivePickerModal({
  isOpen,
  onClose,
  studioId,
  onImportComplete,
}: GoogleDrivePickerModalProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mon Drive' },
  ]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [importStates, setImportStates] = useState<Map<string, FileImportState>>(new Map());
  const [isImporting, setIsImporting] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  // Current folder = last item in breadcrumb
  const currentFolderId = breadcrumb.length > 1
    ? breadcrumb[breadcrumb.length - 1].id
    : undefined;

  // --- Fetch files ---
  const fetchFiles = useCallback(
    async (folderId?: string, pageToken?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (folderId) params.set('folderId', folderId);
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(
          `/api/studios/${studioId}/connectors/google-drive/files?${params.toString()}`,
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `Error ${res.status}`,
          );
        }

        const data = (await res.json()) as {
          files: DriveFile[];
          nextPageToken?: string;
        };

        if (pageToken) {
          // Append to existing files (load more)
          setFiles((prev) => [...prev, ...data.files]);
        } else {
          setFiles(data.files);
        }
        setNextPageToken(data.nextPageToken);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [studioId],
  );

  // --- On open ---
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Reset state and load root
        setFiles([]);
        setBreadcrumb([{ id: 'root', name: 'Mon Drive' }]);
        setSelectedFiles(new Set());
        setImportStates(new Map());
        setIsImporting(false);
        setNextPageToken(undefined);
        fetchFiles();
      } else {
        onClose();
      }
    },
    [fetchFiles, onClose],
  );

  // --- Navigate into folder ---
  const navigateToFolder = useCallback(
    (folder: DriveFile) => {
      setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
      setSelectedFiles(new Set());
      setNextPageToken(undefined);
      fetchFiles(folder.id);
    },
    [fetchFiles],
  );

  // --- Navigate via breadcrumb ---
  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      setSelectedFiles(new Set());
      setNextPageToken(undefined);
      const folderId = index > 0 ? newBreadcrumb[index].id : undefined;
      fetchFiles(folderId);
    },
    [breadcrumb, fetchFiles],
  );

  // --- Toggle file selection ---
  const toggleSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  // --- Import selected files ---
  const handleImport = useCallback(async () => {
    const filesToImport = files.filter(
      (f) => selectedFiles.has(f.id) && f.mimeType !== FOLDER_MIME,
    );

    if (filesToImport.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    for (const file of filesToImport) {
      setImportStates((prev) => {
        const next = new Map(prev);
        next.set(file.id, { fileId: file.id, status: 'importing' });
        return next;
      });

      try {
        const res = await fetch(
          `/api/studios/${studioId}/connectors/google-drive/import`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: file.id, fileName: file.name }),
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `Error ${res.status}`,
          );
        }

        setImportStates((prev) => {
          const next = new Map(prev);
          next.set(file.id, { fileId: file.id, status: 'done' });
          return next;
        });
        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setImportStates((prev) => {
          const next = new Map(prev);
          next.set(file.id, { fileId: file.id, status: 'error', error: msg });
          return next;
        });
        toast.error(`Erreur: ${file.name}`, { description: msg });
      }
    }

    setIsImporting(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} fichier${successCount > 1 ? 's' : ''} importe${successCount > 1 ? 's' : ''}`,
      );
      onImportComplete();
    }
  }, [files, selectedFiles, studioId, onImportComplete]);

  // --- File type label ---
  const getMimeLabel = (mimeType: string): string => {
    return MIME_LABELS[mimeType] ?? mimeType.split('/').pop() ?? 'Fichier';
  };

  // --- Format date ---
  const formatDate = (isoDate: string): string => {
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(isoDate));
    } catch {
      return '';
    }
  };

  const selectableFiles = files.filter((f) => f.mimeType !== FOLDER_MIME);
  const selectedCount = [...selectedFiles].filter((id) =>
    selectableFiles.some((f) => f.id === id),
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importer depuis Google Drive</DialogTitle>
          <DialogDescription>
            Parcourez vos fichiers et selectionnez ceux a importer comme sources.
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-1 text-sm overflow-x-auto py-1">
          {breadcrumb.map((item, index) => (
            <span key={item.id} className="flex items-center gap-1 flex-shrink-0">
              {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <button
                className={cn(
                  'hover:underline transition-colors',
                  index === breadcrumb.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => navigateToBreadcrumb(index)}
              >
                {item.name}
              </button>
            </span>
          ))}
        </nav>

        {/* Back button for nested folders */}
        {breadcrumb.length > 1 && (
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
            onClick={() => navigateToBreadcrumb(breadcrumb.length - 2)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto border rounded-lg min-h-[300px]">
          {isLoading && files.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchFiles(currentFolderId)}
              >
                Reessayer
              </Button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Folder className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun fichier dans ce dossier</p>
            </div>
          ) : (
            <div className="divide-y">
              {files.map((file) => {
                const isFileFolder = file.mimeType === FOLDER_MIME;
                const isSelected = selectedFiles.has(file.id);
                const importState = importStates.get(file.id);

                return (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                      'hover:bg-muted/50',
                      isSelected && !isFileFolder && 'bg-primary/5',
                      importState?.status === 'done' && 'opacity-60',
                    )}
                    onClick={() => {
                      if (isFileFolder) {
                        navigateToFolder(file);
                      } else if (!importState || importState.status === 'error') {
                        toggleSelection(file.id);
                      }
                    }}
                  >
                    {/* Checkbox / Folder icon */}
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {isFileFolder ? (
                        <Folder className="h-5 w-5 text-blue-500" />
                      ) : importState?.status === 'importing' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : importState?.status === 'done' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : importState?.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div
                          className={cn(
                            'h-4 w-4 rounded border-2 transition-colors',
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/30',
                          )}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* File icon from Google */}
                    {!isFileFolder && file.iconLink && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.iconLink}
                        alt=""
                        className="h-5 w-5 flex-shrink-0"
                      />
                    )}
                    {!isFileFolder && !file.iconLink && (
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}

                    {/* Name and metadata */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isFileFolder
                          ? 'Dossier'
                          : `${getMimeLabel(file.mimeType)} - ${formatDate(file.modifiedTime)}`}
                      </p>
                    </div>

                    {/* Folder arrow */}
                    {isFileFolder && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}

              {/* Load more */}
              {nextPageToken && (
                <div className="flex justify-center py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => fetchFiles(currentFolderId, nextPageToken)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Charger plus
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} fichier${selectedCount > 1 ? 's' : ''} selectionne${selectedCount > 1 ? 's' : ''}`
              : 'Selectionnez des fichiers a importer'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isImporting}>
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Import en cours...
                </>
              ) : (
                `Importer${selectedCount > 0 ? ` (${selectedCount})` : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
