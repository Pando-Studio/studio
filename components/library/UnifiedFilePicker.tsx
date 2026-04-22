'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Upload, X } from 'lucide-react';
import { useGoogleDrive, type GoogleDriveFile } from '@/hooks/use-google-drive';
import { OneDrivePicker, type OneDriveFile } from './OneDrivePicker';
import { useDropbox, type DropboxFile } from '@/hooks/use-dropbox';

// Types MIME et extensions supportes
const SUPPORTED_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.xlsx', '.txt', '.md', '.html', '.csv',
  '.png', '.jpg', '.jpeg', '.webp',
  '.mp3', '.wav', '.ogg', '.m4a', '.webm',
  '.mp4', '.mov',
];
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export type FileSource = 'local' | 'google' | 'onedrive' | 'dropbox';

export interface PendingFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  source: FileSource;
  file?: File;
  googleDriveFile?: GoogleDriveFile;
  oneDriveFile?: OneDriveFile;
  dropboxFile?: DropboxFile;
}

interface UnifiedFilePickerProps {
  multiple?: boolean;
  maxFiles?: number;
  onFilesChange?: (files: PendingFile[]) => void;
  onUpload?: (files: PendingFile[]) => Promise<void>;
  compact?: boolean;
}

export function UnifiedFilePicker({
  multiple = true,
  maxFiles = 0,
  onFilesChange,
  onUpload,
  compact = false,
}: UnifiedFilePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOneDrivePicker, setShowOneDrivePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive hook
  const { isLoading: isGoogleLoading, handleOpenPicker: openGooglePicker } = useGoogleDrive({
    onFilesSelected: (files) => {
      const newFiles: PendingFile[] = files.map((f) => ({
        id: `google-${f.id}`,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        source: 'google' as const,
        googleDriveFile: f,
      }));
      addFiles(newFiles);
    },
    onError: (err) => setError(err.message),
  });

  // Dropbox hook
  const { isLoading: isDropboxLoading, openChooser: openDropboxChooser } = useDropbox({
    onFilesSelected: (files) => {
      const newFiles: PendingFile[] = files.map((f) => ({
        id: `dropbox-${f.id}`,
        name: f.name,
        size: f.bytes,
        mimeType: getMimeTypeFromExtension(f.name),
        source: 'dropbox' as const,
        dropboxFile: f,
      }));
      addFiles(newFiles);
    },
    onError: (err) => setError(err.message),
  });

  const addFiles = useCallback(
    (newFiles: PendingFile[]) => {
      setPendingFiles((prev) => {
        const updated = [...prev];

        // Verifier la limite
        if (maxFiles > 0) {
          const availableSlots = maxFiles - prev.length;
          if (availableSlots <= 0) {
            setError(`Vous ne pouvez pas ajouter plus de ${maxFiles} fichier(s)`);
            return prev;
          }
          newFiles = newFiles.slice(0, availableSlots);
        }

        // Eviter les doublons
        for (const file of newFiles) {
          if (!updated.some((f) => f.id === file.id || f.name === file.name)) {
            updated.push(file);
          }
        }

        onFilesChange?.(updated);
        return updated;
      });
      setError(null);
    },
    [maxFiles, onFilesChange]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      setPendingFiles((prev) => {
        const updated = prev.filter((f) => f.id !== fileId);
        onFilesChange?.(updated);
        return updated;
      });
    },
    [onFilesChange]
  );

  const validateFile = useCallback((file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return SUPPORTED_MIME_TYPES.includes(file.type) || SUPPORTED_EXTENSIONS.includes(extension);
  }, []);

  // Drag and drop
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(validateFile);

      if (files.length === 0) {
        setError('Formats acceptes: PDF, Word, PowerPoint, Excel, TXT, Markdown, HTML, CSV, Images, Audio, Video');
        return;
      }

      const newFiles: PendingFile[] = files.map((f) => ({
        id: `local-${Date.now()}-${f.name}`,
        name: f.name,
        size: f.size,
        mimeType: f.type,
        source: 'local' as const,
        file: f,
      }));

      addFiles(newFiles);
    },
    [validateFile, addFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const files = Array.from(e.target.files).filter(validateFile);

      const newFiles: PendingFile[] = files.map((f) => ({
        id: `local-${Date.now()}-${f.name}`,
        name: f.name,
        size: f.size,
        mimeType: f.type,
        source: 'local' as const,
        file: f,
      }));

      addFiles(newFiles);
      e.target.value = '';
    },
    [validateFile, addFiles]
  );

  const handleOneDriveFilesSelected = useCallback(
    (files: OneDriveFile[]) => {
      const newFiles: PendingFile[] = files.map((f) => ({
        id: `onedrive-${f.id}`,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        source: 'onedrive' as const,
        oneDriveFile: f,
      }));
      addFiles(newFiles);
    },
    [addFiles]
  );

  const handleUpload = useCallback(async () => {
    if (pendingFiles.length === 0 || !onUpload) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(pendingFiles);
      setPendingFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  }, [pendingFiles, onUpload]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getSourceIcon = (source: FileSource): string => {
    switch (source) {
      case 'google':
        return '🔵';
      case 'onedrive':
        return '🟦';
      case 'dropbox':
        return '📦';
      default:
        return '📄';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Zone de drop */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className={compact ? 'py-4' : 'py-8'}>
          <div className="text-center">
            <Upload className={`mx-auto text-muted-foreground ${compact ? 'h-8 w-8 mb-2' : 'h-12 w-12 mb-4'}`} />
            <h3 className="font-semibold mb-1">
              {isDragging ? 'Deposez ici' : 'Glissez un document ici'}
            </h3>
            {!compact && (
              <p className="text-sm text-muted-foreground">
                PDF, Word, PowerPoint, Excel, TXT, Markdown, HTML, CSV, Images, Audio, Video (max 100 Mo)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={SUPPORTED_EXTENSIONS.join(',')}
        multiple={multiple}
        onChange={handleFileInputChange}
      />

      {/* Boutons cloud */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={openGooglePicker}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? '...' : '🔵 Google Drive'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOneDrivePicker(true)}
        >
          🟦 OneDrive
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={openDropboxChooser}
          disabled={isDropboxLoading}
        >
          {isDropboxLoading ? '...' : '📦 Dropbox'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          📁 Parcourir
        </Button>
      </div>

      {/* Liste des fichiers en attente */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Fichiers selectionnes ({pendingFiles.length})
          </h4>
          <div className="space-y-1">
            {pendingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span>{getSourceIcon(file.source)}</span>
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Bouton upload */}
      {pendingFiles.length > 0 && onUpload && (
        <Button
          className="w-full"
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading
            ? 'Upload en cours...'
            : `Importer ${pendingFiles.length} fichier(s)`}
        </Button>
      )}

      {/* OneDrive Picker Modal */}
      <OneDrivePicker
        isOpen={showOneDrivePicker}
        onClose={() => setShowOneDrivePicker(false)}
        onFilesSelected={handleOneDriveFilesSelected}
      />
    </div>
  );
}

// Helper pour obtenir le MIME type depuis l'extension
function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    webm: 'video/webm',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
