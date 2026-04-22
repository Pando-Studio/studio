'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import { Loader2, Clock, LogOut } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    // Re-navigate to dashboard — the server layout will check status
    // If approved, user lands on dashboard. If still pending, redirects back here.
    router.push('/dashboard');
    // Small delay to show loading state before navigation
    setTimeout(() => setIsChecking(false), 2000);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-950/50 ring-1 ring-amber-800/50">
            <Clock className="h-8 w-8 text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-neutral-100">
            Compte en attente d&apos;approbation
          </h1>

          <p className="text-sm text-neutral-400 leading-relaxed">
            Votre compte a bien ete cree. Un administrateur doit approuver votre
            acces avant que vous puissiez utiliser Studio.
          </p>

          <p className="text-xs text-neutral-500">
            Contactez votre administrateur si vous pensez que c&apos;est une erreur.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Verifier mon statut
          </Button>

          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full"
          >
            {isSigningOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Se deconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
