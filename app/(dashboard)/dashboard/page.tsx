'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { Plus, FolderOpen, FileText, Presentation, Loader2 } from 'lucide-react';

interface Studio {
  id: string;
  title: string;
  description?: string;
  updatedAt: string;
  _count: {
    sources: number;
    widgets: number;
    presentations: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchStudios();
  }, []);

  const fetchStudios = async () => {
    try {
      const response = await fetch('/api/studios');
      const data = await response.json();
      setStudios(data.studios || []);
    } catch (error) {
      console.error('Error fetching studios:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStudio = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const response = await fetch('/api/studios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Nouveau Studio',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create studio');
      }

      // Rediriger directement vers l'interface d'edition
      router.push(`/studios/${data.studio.id}`);
    } catch (error) {
      console.error('Error creating studio:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes Studios</h1>
          <p className="text-muted-foreground mt-1">
            Creez et gerez vos espaces de contenu interactif
          </p>
        </div>
        <Button onClick={createStudio} disabled={isCreating}>
          {isCreating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Nouveau Studio
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : studios.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucun studio</h2>
          <p className="text-muted-foreground mb-4">
            Commencez par creer votre premier studio
          </p>
          <Button onClick={createStudio} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Creer un studio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studios.map((studio) => (
            <Link key={studio.id} href={`/studios/${studio.id}`}>
              <div className="border rounded-lg p-6 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                <h3 className="text-lg font-semibold mb-2">{studio.title}</h3>
                {studio.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {studio.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {studio._count.sources} sources
                  </div>
                  <div className="flex items-center gap-1">
                    <Presentation className="h-4 w-4" />
                    {studio._count.widgets} widgets
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Mis a jour le {new Date(studio.updatedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
