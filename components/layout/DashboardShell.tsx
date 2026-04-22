'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Studio detail page uses its own full-screen 3-panel layout
  const isStudioDetailPage = pathname.match(/^\/studios\/[^/]+$/) !== null;

  if (isStudioDetailPage) {
    return <>{children}</>;
  }

  // Standard dashboard layout: sidebar + content with rounded corners
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-[68px] bg-white flex items-center px-8" />
        {/* Content area with rounded top corners (Engage pattern) */}
        <main className="flex-1 bg-background rounded-tl-3xl rounded-tr-3xl overflow-auto">
          <div className="pt-8 pl-10 pr-10 pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
