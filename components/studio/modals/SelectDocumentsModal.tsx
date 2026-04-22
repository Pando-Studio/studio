'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Input } from '@/components/ui';
import {
  FileText,
  Search,
  CheckSquare,
  Square,
  Loader2,
  Upload,
  FolderOpen,
} from 'lucide-react';
import { UnifiedFilePicker, type PendingFile } from '@/components/library/UnifiedFilePicker';

interface LibraryDocument {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  status: string;
  source: string;
  createdAt: string;
  chunksCount: number;
  studioId: string;
}

interface SelectDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  onSourcesAdded: () => void;
}

type TabType = 'library' | 'upload';

export function SelectDocumentsModal({
  isOpen,
  onClose,
  studioId,
  onSourcesAdded,
}: SelectDocumentsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      setSelectedDocIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen, fetchDocuments]);

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    return doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleAddFromLibrary = async () => {
    if (selectedDocIds.size === 0) return;

    setIsAdding(true);
    try {
      // Pour chaque document selectionne, creer un lien vers le studio
      for (const docId of selectedDocIds) {
        const doc = documents.find((d) => d.id === docId);
        if (!doc) continue;

        await fetch(`/api/studios/${studioId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: docId,
          }),
        });
      }

      onSourcesAdded();
      onClose();
    } catch (error) {
      console.error('Error adding sources:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpload = async (files: PendingFile[]) => {
    setIsAdding(true);
    try {
      for (const pendingFile of files) {
        const formData = new FormData();

        if (pendingFile.file) {
          formData.append('file', pendingFile.file);
          formData.append('source', 'LOCAL');
          formData.append('studioId', studioId);

          await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });
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
              studioId,
            }),
          });
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
              studioId,
            }),
          });
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
              studioId,
            }),
          });
        }
      }

      onSourcesAdded();
      onClose();
    } catch (error) {
      console.error('Error uploading documents:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter des sources</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'library' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('library')}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Depuis la bibliotheque
          </Button>
          <Button
            variant={activeTab === 'upload' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('upload')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer nouveau
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Documents list */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? 'Aucun document trouve'
                        : 'Aucun document dans la bibliotheque'}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setActiveTab('upload')}
                      >
                        Importer un document
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                          isSelected
                            ? 'bg-primary/10 border-primary/30'
                            : 'hover:bg-muted border-transparent'
                        }`}
                        onClick={() => toggleDocSelection(doc.id)}
                      >
                        <button className="flex-shrink-0">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(doc.size)} - {doc.chunksCount} chunk(s)
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            doc.status === 'INDEXED'
                              ? 'bg-green-100 text-green-700'
                              : doc.status === 'ERROR'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {doc.status === 'INDEXED' ? 'Pret' : doc.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <UnifiedFilePicker onUpload={handleUpload} compact />
          )}
        </div>

        {/* Footer */}
        {activeTab === 'library' && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={handleAddFromLibrary}
              disabled={selectedDocIds.size === 0 || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                `Ajouter ${selectedDocIds.size} document(s)`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
