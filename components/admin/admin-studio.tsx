'use client';

import { useMemo } from 'react';
import { Studio } from '@prisma/studio-core/ui';
import { createPostgresAdapter } from '@prisma/studio-core/data/postgres-core';
import { createStudioBFFClient } from '@prisma/studio-core/data/bff';
import '@prisma/studio-core/ui/index.css';

export default function AdminStudio() {
  const adapter = useMemo(() => {
    const executor = createStudioBFFClient({
      url: '/api/admin/studio',
    });
    return createPostgresAdapter({ executor });
  }, []);

  return (
    <div className="h-full w-full" style={{ colorScheme: 'dark' }}>
      <Studio adapter={adapter} />
    </div>
  );
}
