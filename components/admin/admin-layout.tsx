'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  email: string;
}

export function AdminLayout({ children, email }: AdminLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="h-4 w-px bg-neutral-700" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Admin</span>
          </div>
        </div>
        <span className="text-sm text-neutral-500">{email}</span>
      </header>

      <div className="border-b border-amber-900/50 bg-amber-950/30 px-4 py-2">
        <p className="text-xs text-amber-400/80">
          Acces complet a la base de donnees. Les modifications sont immediates
          et irreversibles.
        </p>
      </div>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
