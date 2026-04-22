'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui';
import {
  Upload,
  FileText,
  Globe,
  Youtube,
  Check,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface Source {
  id: string;
  title: string;
  type: 'DOCUMENT' | 'WEB' | 'YOUTUBE';
  status: 'PENDING' | 'INDEXING' | 'INDEXED' | 'ERROR';
  url?: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}

export default function SourcesPage() {
  const params = useParams();
  const studioId = params.id as string;
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (studioId) {
      fetchSources();
    }
  }, [studioId]);

  const fetchSources = async () => {
    try {
      const response = await fetch(`/api/studios/${studioId}`);
      const data = await response.json();
      setSources(data.studio?.sources || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studioId', studioId);
      formData.append('title', file.name);

      const response = await fetch('/api/sources/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.source) {
        setSources([data.source, ...sources]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusIcon = (status: Source['status']) => {
    switch (status) {
      case 'INDEXED':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'INDEXING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: Source['type']) => {
    switch (type) {
      case 'WEB':
        return <Globe className="h-5 w-5" />;
      case 'YOUTUBE':
        return <Youtube className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sources</h1>
          <p className="text-muted-foreground mt-1">
            Ajoutez des documents, URLs ou videos pour alimenter votre contenu
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.pptx,.txt,.md"
            onChange={handleFileUpload}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Importer un document
          </Button>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center mb-8 hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Deposez vos fichiers ici</p>
        <p className="text-muted-foreground text-sm mt-1">
          PDF, DOCX, PPTX, TXT, MD (max 50 MB)
        </p>
      </div>

      {/* Sources list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Aucune source ajoutee</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="border rounded-lg p-4 flex items-center gap-4"
            >
              <div className="p-2 bg-muted rounded-lg">
                {getTypeIcon(source.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{source.title}</h4>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{source.type}</span>
                  {source.size && <span>{formatFileSize(source.size)}</span>}
                  <span>
                    {new Date(source.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(source.status)}
                <span className="text-sm capitalize">
                  {source.status.toLowerCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
