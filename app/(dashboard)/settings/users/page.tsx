'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Shield,
  ShieldAlert,
  Ban,
  CheckCircle,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserEntry {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { studios: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  creator: { label: 'Creator', color: 'bg-blue-100 text-blue-700' },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600' },
  user: { label: 'User', color: 'bg-gray-100 text-gray-500' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Actif', color: 'text-green-600' },
  pending: { label: 'En attente', color: 'text-yellow-600' },
  suspended: { label: 'Suspendu', color: 'text-red-600' },
};

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as
    | string
    | undefined;

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      });
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = (await response.json()) as {
        users: UserEntry[];
        pagination: Pagination;
      };
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(1, search);
  }, [fetchUsers, search]);

  const updateUser = async (
    userId: string,
    updates: { role?: string; banned?: boolean; banReason?: string },
  ) => {
    setUpdating(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        alert(data.error || 'Failed to update user');
        return;
      }

      // Refresh current page
      await fetchUsers(pagination.page, search);
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUser(userId, { role: newRole });
  };

  const handleToggleBan = (user: UserEntry) => {
    if (user.banned) {
      updateUser(user.id, { banned: false });
    } else {
      const reason = prompt('Raison du ban (optionnel):');
      updateUser(user.id, { banned: true, banReason: reason || undefined });
    }
  };

  // Non-admin sees nothing
  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Acces reserve aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <p className="text-muted-foreground mt-1">
          Gerez les roles et les acces des utilisateurs de la plateforme.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par email ou nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Aucun utilisateur trouve.
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 font-medium">Studios</th>
                  <th className="text-left px-4 py-3 font-medium">Inscription</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleInfo = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
                  const statusInfo = STATUS_CONFIG[user.status] || STATUS_CONFIG.pending;
                  const isCurrentUser = user.id === currentUserId;
                  const isUpdating = updating === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        'border-b last:border-b-0 transition-colors',
                        user.banned && 'bg-red-50/50',
                        isUpdating && 'opacity-60',
                      )}
                    >
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.name || 'Sans nom'}
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground">(vous)</span>
                            )}
                            {user.banned && (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                <Ban className="h-3 w-3" />
                                Banni
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-xs">{user.email}</div>
                        </div>
                      </td>

                      {/* Role dropdown */}
                      <td className="px-4 py-3">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={isCurrentUser || isUpdating}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                                  roleInfo.color,
                                )}
                              >
                                {user.role === 'admin' && <Shield className="h-3 w-3" />}
                                {roleInfo.label}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="creator">Creator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Studios count */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {user._count.studios}
                        </span>
                      </td>

                      {/* Created at */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {!isCurrentUser && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              'h-7 text-xs',
                              user.banned
                                ? 'text-green-600 hover:text-green-700'
                                : 'text-red-600 hover:text-red-700',
                            )}
                            onClick={() => handleToggleBan(user)}
                            disabled={isUpdating}
                          >
                            {user.banned ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Debannir
                              </>
                            ) : (
                              <>
                                <Ban className="h-3 w-3 mr-1" />
                                Bannir
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                {pagination.total} utilisateur{pagination.total > 1 ? 's' : ''} au total
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page - 1, search)}
                  disabled={pagination.page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page + 1, search)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
