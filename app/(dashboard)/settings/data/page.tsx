'use client';

import { useState } from 'react';
import { Button, Card, Input, Label } from '@/components/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Loader2, Trash2, ShieldAlert } from 'lucide-react';

export default function DataPrivacyPage() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    setExportSuccess('');

    try {
      const response = await fetch('/api/settings/data-export', {
        method: 'POST',
      });

      if (response.status === 429) {
        setExportError('Vous avez deja exporte vos donnees aujourd\'hui. Reessayez demain.');
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        setExportError(data.error || 'Erreur lors de l\'export');
        return;
      }

      // Download the JSON file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qiplim-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess('Export telecharge avec succes.');
    } catch {
      setExportError('Erreur de connexion');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/settings/data-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        setDeleteError(data.error || 'Erreur lors de la suppression');
        setDeleting(false);
        return;
      }

      // Redirect to login after account deletion
      window.location.href = '/login';
    } catch {
      setDeleteError('Erreur de connexion');
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Donnees et confidentialite</h1>
        <p className="text-muted-foreground mt-1">
          Gerez vos donnees personnelles conformement au RGPD.
        </p>
      </div>

      <div className="space-y-6">
        {/* Export Section */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Exporter mes donnees</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Telechargez une copie complete de toutes vos donnees au format JSON.
                Cela inclut vos studios, documents, widgets, conversations, favoris,
                memoires et resultats.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Limite : 1 export par jour.
              </p>

              {exportError && (
                <div className="mt-3 p-2 rounded bg-red-500/10 text-red-500 text-sm">
                  {exportError}
                </div>
              )}

              {exportSuccess && (
                <div className="mt-3 p-2 rounded bg-green-500/10 text-green-500 text-sm">
                  {exportSuccess}
                </div>
              )}

              <Button
                className="mt-4"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exporter mes donnees
              </Button>
            </div>
          </div>
        </Card>

        {/* Delete Section */}
        <Card className="p-6 border-red-500/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-500/10">
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-500">
                Supprimer mon compte
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cette action est irreversible. Toutes vos donnees seront definitivement
                supprimees : studios, documents, widgets, conversations, favoris,
                memoires, resultats, cles API et votre compte utilisateur.
              </p>

              {deleteError && (
                <div className="mt-3 p-2 rounded bg-red-500/10 text-red-500 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="confirm-email" className="text-sm">
                    Pour confirmer, saisissez votre adresse email
                  </Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="max-w-sm"
                  />
                </div>

                <AlertDialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                      disabled={!confirmEmail || deleting}
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Supprimer definitivement mon compte
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Confirmation de suppression
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Vous etes sur le point de supprimer definitivement votre
                        compte et toutes vos donnees. Cette action est
                        irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Oui, supprimer mon compte
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </Card>

        {/* Privacy Policy Link */}
        <div className="text-sm text-muted-foreground">
          Consultez notre{' '}
          <a
            href="/privacy"
            className="text-primary underline hover:no-underline"
          >
            politique de confidentialite
          </a>{' '}
          pour en savoir plus sur le traitement de vos donnees.
        </div>
      </div>
    </div>
  );
}
