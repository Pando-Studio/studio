'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function PublicPlayerRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/public/s/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Studio not found');
        return res.json();
      })
      .then((data) => {
        router.replace(`/studios/${data.studio.id}`);
      })
      .catch(() => {
        setError('This studio is not available or has been made private.');
      });
  }, [slug, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Studio not found</h1>
          <p className="text-muted-foreground">{error}</p>
          <a href="/" className="text-primary hover:underline text-sm">
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
