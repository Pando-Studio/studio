'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Label } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Share2,
  Globe,
  Copy,
  Check,
  UserPlus,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareData {
  isPublic: boolean;
  publicSlug: string | null;
  publicUrl: string | null;
  shares: Array<{
    id: string;
    email: string | null;
    role: string;
    user: { id: string; name: string | null; email: string } | null;
  }>;
}

export function ShareDialog({ studioId }: { studioId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/share`);
      const json = await res.json();
      setData(json);
    } catch {
      setError('Failed to load sharing settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchShares();
  }, [open]);

  const togglePublic = async () => {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !data.isPublic }),
      });
      const json = await res.json();
      setData((prev) => prev ? { ...prev, ...json } : prev);
    } catch {
      setError('Failed to update');
    } finally {
      setToggling(false);
    }
  };

  const copyLink = () => {
    if (!data?.publicUrl) return;
    const fullUrl = `${window.location.origin}${data.publicUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    try {
      const res = await fetch(`/api/studios/${studioId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: 'VIEWER' }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Failed to invite');
        return;
      }
      setInviteEmail('');
      fetchShares();
    } catch {
      setError('Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      await fetch(`/api/studios/${studioId}/share?shareId=${shareId}`, {
        method: 'DELETE',
      });
      fetchShares();
    } catch {
      // silent
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share studio</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Public access toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Public access</Label>
                </div>
                <Button
                  variant={data?.isPublic ? 'default' : 'outline'}
                  size="sm"
                  onClick={togglePublic}
                  disabled={toggling}
                  className="min-w-[80px]"
                >
                  {toggling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : data?.isPublic ? (
                    'Enabled'
                  ) : (
                    'Disabled'
                  )}
                </Button>
              </div>

              {data?.isPublic && data.publicUrl && (
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}${data.publicUrl}`}
                    className="text-xs h-8 font-mono"
                  />
                  <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={copyLink}>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <a
                    href={data.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm" className="h-8">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              )}

              {data?.isPublic && (
                <p className="text-xs text-muted-foreground">
                  Anyone with the link can view and interact with generated widgets. No editing, uploading, or generation possible.
                </p>
              )}
            </div>

            {/* Separator */}
            <div className="border-t" />

            {/* Invite by email */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Invite people</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && inviteUser()}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={inviteUser}
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Invite'}
                </Button>
              </div>
            </div>

            {/* Current shares */}
            {data?.shares && data.shares.length > 0 && (
              <div className="space-y-2">
                {data.shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {(share.user?.name?.[0] || share.email?.[0] || '?').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm truncate">
                        {share.user?.email || share.email || 'Unknown'}
                      </span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded shrink-0',
                        share.role === 'EDITOR' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {share.role.toLowerCase()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeShare(share.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
