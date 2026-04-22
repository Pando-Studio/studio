'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ChevronLeft } from 'lucide-react';

// Placeholder — composite editor page will be rebuilt in Phase 2
export default function CompositeEditorPage() {
  const params = useParams();
  const studioId = params.id as string;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto text-center">
        <Link href={`/studios/${studioId}`}>
          <Button variant="ghost" className="mb-8">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to studio
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mb-4">Composition Editor</h1>
        <p className="text-muted-foreground">
          The composition editor will be available in Phase 2.
          For now, use the main studio editor to create and manage widgets.
        </p>
      </div>
    </div>
  );
}
