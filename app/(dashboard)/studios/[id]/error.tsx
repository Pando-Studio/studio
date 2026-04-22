'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Studio error boundary caught error', {
      error,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold">Studio unavailable</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || 'Failed to load this studio.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
