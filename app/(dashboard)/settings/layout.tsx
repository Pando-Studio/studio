'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Key, Users, Brain, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';

interface SettingsNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const settingsNav: SettingsNavItem[] = [
  { name: 'Providers AI', href: '/settings/providers', icon: Key },
  { name: 'Cles API', href: '/settings/api-keys', icon: KeyRound },
  { name: 'Memoire', href: '/settings/memory', icon: Brain },
  { name: 'Utilisateurs', href: '/settings/users', icon: Users, adminOnly: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as
    | string
    | undefined;
  const isAdmin = userRole === 'admin';

  const visibleNav = settingsNav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex gap-8">
      {/* Settings sidebar */}
      <nav className="w-52 shrink-0">
        <h2 className="text-lg font-semibold mb-4">Parametres</h2>
        <ul className="space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content area */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
