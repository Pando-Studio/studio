'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Library,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mes Studios', href: '/dashboard', icon: FolderOpen },
  { name: 'Bibliotheque', href: '/library', icon: Library },
];

const bottomNavigation = [
  { name: 'Parametres', href: '/settings/providers', icon: Settings },
  { name: 'Aide', href: '#', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white flex flex-col h-screen rounded-br-3xl relative z-10">
      {/* Logo */}
      <div className="pt-9 px-6 pb-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">
            Qiplim <span className="text-yellow-600">Studio</span>
          </span>
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-base',
                      isActive
                        ? 'bg-background text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom navigation */}
      <div className="px-4 pb-12">
        <div className="pt-2 border-t border-neutral-200">
          <ul className="space-y-1 mt-2">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div className="flex items-center gap-3 px-2 py-2 rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-colors text-base">
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
            <li>
              <button className="flex items-center gap-3 px-2 py-2 rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-colors text-base w-full">
                <LogOut className="h-4 w-4" />
                <span>Deconnexion</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
