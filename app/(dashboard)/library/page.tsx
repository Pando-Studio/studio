'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  Plus,
  FileText,
  Trash2,
  RefreshCw,
  Loader2,
  FolderOpen,
  Search,
  Music,
  Video,
  Globe,
  Youtube,
  Sparkles,
  Image as ImageIcon,
  MoreHorizontal,
  FolderPlus,
  Tag,
  ChevronRight,
  ChevronDown,
  X,
  FolderInput,
  Table2,
  Link,
} from 'lucide-react';
import { UnifiedFilePicker, type PendingFile } from '@/components/library/UnifiedFilePicker';

interface DocumentTag {
  id: string;
  name: string;
  color: string;
}

interface Document {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'INDEXING' | 'INDEXED' | 'ERROR';
  type: string;
  source: string;
  createdAt: string;
  chunksCount: number;
  folderId: string | null;
  tags: DocumentTag[];
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  _count: { sources: number };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-500/10 text-yellow-600' },
  INDEXING: { label: 'Indexation...', color: 'bg-blue-500/10 text-blue-600' },
  INDEXED: { label: 'Pret', color: 'bg-green-500/10 text-green-600' },
  ERROR: { label: 'Erreur', color: 'bg-red-500/10 text-red-600' },
};

const typeFilters = [
  { value: 'all', label: 'Tous', icon: null },
  { value: 'DOCUMENT', label: 'Documents', icon: FileText },
  { value: 'AUDIO', label: 'Audio', icon: Music },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'WEB', label: 'Web', icon: Globe },
  { value: 'YOUTUBE', label: 'YouTube', icon: Youtube },
  { value: 'WIDGET', label: 'Widget', icon: Sparkles },
];

function getTypeIcon(mimeType: string, type: string) {
  if (type === 'AUDIO') return Music;
  if (type === 'VIDEO') return Video;
  if (type === 'WEB') return Globe;
  if (type === 'YOUTUBE') return Youtube;
  if (type === 'WIDGET') return Sparkles;
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.includes('csv') || mimeType.includes('spreadsheet')) return Table2;
  return FileText;
}

function getTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('wordprocessingml')) return 'DOCX';
  if (mimeType.includes('presentationml')) return 'PPTX';
  if (mimeType.includes('spreadsheetml')) return 'XLSX';
  if (mimeType === 'text/csv') return 'CSV';
  if (mimeType === 'text/plain') return 'TXT';
  if (mimeType === 'text/markdown') return 'MD';
  if (mimeType === 'text/html') return 'HTML';
  if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase();
  if (mimeType.startsWith('audio/')) return mimeType.split('/')[1].toUpperCase();
  if (mimeType.startsWith('video/')) return mimeType.split('/')[1].toUpperCase();
  return 'Fichier';
}

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // Folder management
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Tag management
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');

  // Tag management modal for a document
  const [tagModalDocId, setTagModalDocId] = useState<string | null>(null);

  // Move to folder modal
  const [moveModalDocId, setMoveModalDocId] = useState<string | null>(null);

  // URL dialog
  const [isUrlOpen, setIsUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (selectedFolderId) params.set('folderId', selectedFolderId);
      if (selectedTagId) params.set('tagId', selectedTagId);

      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, selectedFolderId, selectedTagId]);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/library/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch {
      // Silently fail - folders are optional
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/library/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch {
      // Silently fail - tags are optional
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchFolders();
    fetchTags();
  }, [fetchDocuments, fetchFolders, fetchTags]);

  // Polling for status updates
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === 'PENDING' || d.status === 'INDEXING'
    );
    if (!hasProcessing) return;
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleUpload = async (files: PendingFile[]) => {
    for (const pendingFile of files) {
      const formData = new FormData();

      if (pendingFile.file) {
        formData.append('file', pendingFile.file);
        formData.append('source', 'LOCAL');
      } else if (pendingFile.googleDriveFile) {
        await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'GOOGLE_DRIVE',
            cloudFileId: pendingFile.googleDriveFile.id,
            cloudFileUrl: `https://drive.google.com/uc?id=${pendingFile.googleDriveFile.id}&export=download`,
            filename: pendingFile.name,
            mimeType: pendingFile.mimeType,
            size: pendingFile.size,
          }),
        });
        continue;
      } else if (pendingFile.oneDriveFile) {
        await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'ONEDRIVE',
            cloudFileUrl: pendingFile.oneDriveFile.downloadUrl,
            filename: pendingFile.name,
            mimeType: pendingFile.mimeType,
            size: pendingFile.size,
          }),
        });
        continue;
      } else if (pendingFile.dropboxFile) {
        await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'DROPBOX',
            cloudFileUrl: pendingFile.dropboxFile.link,
            filename: pendingFile.name,
            mimeType: pendingFile.mimeType,
            size: pendingFile.size,
          }),
        });
        continue;
      }

      await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
    }

    setIsUploadOpen(false);
    fetchDocuments();
  };

  const handleDelete = async (documentId: string) => {
    try {
      await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      fetchDocuments();
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const handleRetry = async (documentId: string) => {
    try {
      await fetch(`/api/documents/${documentId}/retry`, { method: 'POST' });
      fetchDocuments();
    } catch {
      setError('Erreur lors de la relance');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const response = await fetch('/api/library/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (response.ok) {
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchFolders();
      }
    } catch {
      setError('Erreur lors de la creation du dossier');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await fetch(`/api/library/folders?id=${folderId}`, { method: 'DELETE' });
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      fetchFolders();
      fetchDocuments();
    } catch {
      setError('Erreur lors de la suppression du dossier');
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const response = await fetch('/api/library/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      if (response.ok) {
        setNewTagName('');
        setIsCreatingTag(false);
        fetchTags();
      }
    } catch {
      setError('Erreur lors de la creation du tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await fetch(`/api/library/tags?id=${tagId}`, { method: 'DELETE' });
      if (selectedTagId === tagId) setSelectedTagId(null);
      fetchTags();
      fetchDocuments();
    } catch {
      setError('Erreur lors de la suppression du tag');
    }
  };

  const handleToggleDocTag = async (docId: string, tagId: string, hasTag: boolean) => {
    try {
      if (hasTag) {
        await fetch(`/api/documents/${docId}/tags?tagId=${tagId}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/documents/${docId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId }),
        });
      }
      fetchDocuments();
    } catch {
      setError('Erreur lors de la mise a jour du tag');
    }
  };

  const handleMoveToFolder = async (docId: string, folderId: string | null) => {
    try {
      await fetch(`/api/documents/${docId}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      setMoveModalDocId(null);
      fetchDocuments();
      fetchFolders();
    } catch {
      setError('Erreur lors du deplacement');
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const response = await fetch('/api/documents/add-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          title: urlTitle.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }
      setUrlInput('');
      setUrlTitle('');
      setIsUrlOpen(false);
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    } finally {
      setUrlLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "a l'instant";
    if (diffMins < 60) return `il y a ${diffMins}min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 30) return `il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Folder tree (only root-level folders for now)
  const rootFolders = useMemo(() => folders.filter((f) => !f.parentId), [folders]);

  const tagColors = ['#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  if (loading && documents.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar - Folders & Tags */}
      <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto flex-shrink-0">
        {/* Folders */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dossiers</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsCreatingFolder(true)}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>

          {isCreatingFolder && (
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Nom du dossier"
                className="flex-1 text-sm px-2 py-1 border rounded bg-background"
                autoFocus
              />
              <Button size="sm" className="h-7 px-2" onClick={handleCreateFolder}>
                OK
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => setIsCreatingFolder(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <button
            className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
              !selectedFolderId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
            }`}
            onClick={() => setSelectedFolderId(null)}
          >
            <FolderOpen className="h-4 w-4" />
            Tous les fichiers
          </button>

          {rootFolders.map((folder) => (
            <div key={folder.id} className="group">
              <button
                className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
                  selectedFolderId === folder.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <FolderOpen className="h-4 w-4" style={folder.color ? { color: folder.color } : undefined} />
                <span className="truncate flex-1">{folder.name}</span>
                <span className="text-xs text-muted-foreground">{folder._count.sources}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </button>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tags</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsCreatingTag(true)}
            >
              <Tag className="h-4 w-4" />
            </Button>
          </div>

          {isCreatingTag && (
            <div className="mb-2 space-y-1">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                placeholder="Nom du tag"
                className="w-full text-sm px-2 py-1 border rounded bg-background"
                autoFocus
              />
              <div className="flex gap-1 items-center">
                {tagColors.map((c) => (
                  <button
                    key={c}
                    className={`h-5 w-5 rounded-full border-2 ${newTagColor === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewTagColor(c)}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="h-7 px-2 flex-1" onClick={handleCreateTag}>
                  Creer
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => setIsCreatingTag(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <button
            className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
              !selectedTagId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
            }`}
            onClick={() => setSelectedTagId(null)}
          >
            Tous les tags
          </button>

          {tags.map((tag) => (
            <div key={tag.id} className="group">
              <button
                className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
                  selectedTagId === tag.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedTagId(tag.id)}
              >
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="truncate flex-1">{tag.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTag(tag.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold">Ma Bibliotheque</h1>
              <p className="text-sm text-muted-foreground">
                {documents.length} fichier(s)
              </p>
            </div>

            <div className="flex gap-2">
              <Dialog open={isUrlOpen} onOpenChange={setIsUrlOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Link className="h-4 w-4 mr-2" />
                    Lien URL
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajouter un lien</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Collez un lien YouTube ou une page web. Le contenu sera automatiquement transcrit et vectorise.
                    </p>
                    <div>
                      <label className="text-sm font-medium mb-1 block">URL</label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                        placeholder="https://www.youtube.com/watch?v=... ou https://..."
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Titre (optionnel)</label>
                      <input
                        type="text"
                        value={urlTitle}
                        onChange={(e) => setUrlTitle(e.target.value)}
                        placeholder="Titre personnalise"
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Youtube className="h-4 w-4 text-red-500" />
                      <span>Les liens YouTube seront transcrits automatiquement</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleAddUrl}
                      disabled={!urlInput.trim() || urlLoading}
                    >
                      {urlLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Ajouter
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Fichier
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Ajouter des fichiers</DialogTitle>
                  </DialogHeader>
                  <UnifiedFilePicker onUpload={handleUpload} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-1">
              {typeFilters.map((tf) => (
                <Button
                  key={tf.value}
                  variant={typeFilter === tf.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTypeFilter(tf.value)}
                >
                  {tf.icon && <tf.icon className="h-3 w-3 mr-1" />}
                  {tf.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="hover:underline text-xs">
              Fermer
            </button>
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun fichier</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Importez des documents, audio, videos ou images pour les utiliser dans vos studios
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter des fichiers
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => {
                const TypeIcon = getTypeIcon(doc.mimeType, doc.type);
                const status = statusLabels[doc.status] || { label: doc.status, color: 'bg-gray-100 text-gray-600' };

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 group"
                  >
                    {/* Icon */}
                    <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                    {/* Filename */}
                    <span className="text-sm font-medium truncate min-w-0 flex-1">
                      {doc.filename}
                    </span>

                    {/* Type label */}
                    <span className="text-xs text-muted-foreground w-12 text-center flex-shrink-0">
                      {getTypeLabel(doc.mimeType)}
                    </span>

                    {/* Size */}
                    <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
                      {formatFileSize(doc.size)}
                    </span>

                    {/* Tags */}
                    <div className="flex gap-1 min-w-0 max-w-[200px] flex-shrink-0">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            backgroundColor: tag.color + '20',
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>

                    {/* Status */}
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </span>

                    {/* Chunks */}
                    {doc.status === 'INDEXED' && (
                      <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
                        {doc.chunksCount} chunks
                      </span>
                    )}

                    {/* Date */}
                    <span className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">
                      {formatRelativeDate(doc.createdAt)}
                    </span>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTagModalDocId(doc.id)}>
                          <Tag className="h-4 w-4 mr-2" />
                          Gerer les tags
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMoveModalDocId(doc.id)}>
                          <FolderInput className="h-4 w-4 mr-2" />
                          Deplacer
                        </DropdownMenuItem>
                        {(doc.status === 'ERROR' || doc.status === 'INDEXING' || (doc.status === 'INDEXED' && doc.chunksCount === 0)) && (
                          <DropdownMenuItem onClick={() => handleRetry(doc.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Relancer
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tag Management Modal */}
      <Dialog open={!!tagModalDocId} onOpenChange={(open) => !open && setTagModalDocId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerer les tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {tags.map((tag) => {
              const doc = documents.find((d) => d.id === tagModalDocId);
              const hasTag = doc?.tags.some((t) => t.id === tag.id) || false;
              return (
                <button
                  key={tag.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    hasTag ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onClick={() => tagModalDocId && handleToggleDocTag(tagModalDocId, tag.id, hasTag)}
                >
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-left">{tag.name}</span>
                  {hasTag && <span className="text-primary text-xs">Actif</span>}
                </button>
              );
            })}
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun tag. Creez-en un dans la barre laterale.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Modal */}
      <Dialog open={!!moveModalDocId} onOpenChange={(open) => !open && setMoveModalDocId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deplacer dans un dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted"
              onClick={() => moveModalDocId && handleMoveToFolder(moveModalDocId, null)}
            >
              <FolderOpen className="h-4 w-4" />
              Racine (aucun dossier)
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted"
                onClick={() => moveModalDocId && handleMoveToFolder(moveModalDocId, folder.id)}
              >
                <FolderOpen
                  className="h-4 w-4"
                  style={folder.color ? { color: folder.color } : undefined}
                />
                {folder.name}
              </button>
            ))}
            {folders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun dossier. Creez-en un dans la barre laterale.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
