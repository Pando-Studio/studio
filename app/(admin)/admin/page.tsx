'use client';

import dynamic from 'next/dynamic';

const AdminStudio = dynamic(() => import('@/components/admin/admin-studio'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-neutral-500">
      Chargement de Studio...
    </div>
  ),
});

export default function AdminPage() {
  return <AdminStudio />;
}
