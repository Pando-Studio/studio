'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { Button } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

export interface OneDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webUrl: string;
  downloadUrl?: string;
  driveId: string;
}

interface OneDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: OneDriveFile[]) => void;
}

// Configuration MSAL
const getMsalConfig = () => ({
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'localStorage' as const,
  },
});

const loginRequest = {
  scopes: ['Files.Read', 'Files.Read.All', 'Sites.Read.All'],
};

// Types OneDrive File Picker v8
interface OneDrivePickerItem {
  id: string;
  name: string;
  size: number;
  parentReference: {
    driveId: string;
  };
  webUrl: string;
  file?: {
    mimeType: string;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

interface PickCommand {
  command: 'pick';
  items: OneDrivePickerItem[];
}

export function OneDrivePicker({ isOpen, onClose, onFilesSelected }: OneDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const msalInstance = useRef<PublicClientApplication | null>(null);
  const pickerWindow = useRef<Window | null>(null);

  const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;

  // Initialiser MSAL
  useEffect(() => {
    if (!clientId) return;

    const initMsal = async () => {
      msalInstance.current = new PublicClientApplication(getMsalConfig());
      await msalInstance.current.initialize();

      const accounts = msalInstance.current.getAllAccounts();
      setIsAuthenticated(accounts.length > 0);
    };

    initMsal();
  }, [clientId]);

  // Gerer les messages du picker
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== 'https://onedrive.live.com' && !event.origin.includes('sharepoint.com')) {
        return;
      }

      const message = event.data as PickCommand;

      if (message.command === 'pick' && message.items) {
        const files: OneDriveFile[] = message.items.map((item) => ({
          id: item.id,
          name: item.name,
          mimeType: item.file?.mimeType || 'application/octet-stream',
          size: item.size,
          webUrl: item.webUrl,
          downloadUrl: item['@microsoft.graph.downloadUrl'],
          driveId: item.parentReference.driveId,
        }));

        onFilesSelected(files);
        pickerWindow.current?.close();
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onFilesSelected, onClose]);

  const handleLogin = useCallback(async () => {
    if (!msalInstance.current) return;

    setIsLoading(true);
    setError(null);

    try {
      await msalInstance.current.loginPopup(loginRequest);
      setIsAuthenticated(true);
    } catch (err) {
      setError('Erreur de connexion Microsoft');
      console.error('MSAL login error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenPicker = useCallback(async () => {
    if (!msalInstance.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const accounts = msalInstance.current.getAllAccounts();
      if (accounts.length === 0) {
        await handleLogin();
        return;
      }

      // Obtenir le token
      const tokenResponse = await msalInstance.current.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      // Ouvrir le picker OneDrive
      const pickerUrl = new URL('https://onedrive.live.com/picker');
      pickerUrl.searchParams.set('sdk', '8.0');
      pickerUrl.searchParams.set('entry', JSON.stringify({
        oneDrive: {
          files: {},
        },
      }));
      pickerUrl.searchParams.set('authentication', JSON.stringify({
        accessToken: tokenResponse.accessToken,
      }));
      pickerUrl.searchParams.set('messaging', JSON.stringify({
        origin: window.location.origin,
        channelId: 'qiplim-studio',
      }));
      pickerUrl.searchParams.set('typesAndSources', JSON.stringify({
        mode: 'files',
        pivots: {
          oneDrive: true,
          recent: true,
          sharedLibraries: true,
        },
      }));

      const width = 800;
      const height = 600;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      pickerWindow.current = window.open(
        pickerUrl.toString(),
        'OneDrivePicker',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      setError('Erreur lors de l\'ouverture du picker');
      console.error('Picker error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [handleLogin]);

  if (!clientId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selectionner depuis OneDrive</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          {error && (
            <div className="text-sm text-destructive text-center">{error}</div>
          )}

          {!isAuthenticated ? (
            <Button onClick={handleLogin} disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter avec Microsoft'}
            </Button>
          ) : (
            <Button onClick={handleOpenPicker} disabled={isLoading}>
              {isLoading ? 'Chargement...' : 'Ouvrir OneDrive'}
            </Button>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Selectionnez des fichiers depuis votre OneDrive personnel ou SharePoint professionnel.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
