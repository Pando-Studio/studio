'use client';

import { useCallback, useState } from 'react';
import useDrivePicker from 'react-google-drive-picker';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

type PickerState = 'idle' | 'opening' | 'processing' | 'completed';

interface UseGoogleDriveProps {
  onFilesSelected?: (files: GoogleDriveFile[]) => void;
  onError?: (error: Error) => void;
}

// Types MIME supportes pour les documents
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/markdown',
  'text/html',
  'application/vnd.google-apps.document', // Google Docs
  'application/vnd.google-apps.presentation', // Google Slides
  'application/vnd.google-apps.spreadsheet', // Google Sheets
];

export function useGoogleDrive({ onFilesSelected, onError }: UseGoogleDriveProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [pickerState, setPickerState] = useState<PickerState>('idle');
  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveFile[]>([]);
  const [openPicker] = useDrivePicker();

  const handleOpenPicker = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const developerKey = process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY;

    if (!clientId || !developerKey) {
      onError?.(new Error('Google Drive non configure'));
      return;
    }

    setPickerState('opening');
    setIsLoading(true);

    // Timeout de securite pour eviter l'etat bloque
    const safetyTimeout = setTimeout(() => {
      console.warn('Google Drive picker timeout - resetting loading state');
      setIsLoading(false);
      setPickerState('idle');
    }, 30000);

    setTimeout(() => {
      openPicker({
        clientId,
        developerKey,
        viewId: 'DOCS',
        showUploadView: false,
        showUploadFolders: false,
        supportDrives: true,
        multiselect: true,
        customScopes: ['https://www.googleapis.com/auth/drive.file'],
        callbackFunction: (data) => {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
          setPickerState('processing');

          if (data.action === 'picked') {
            const driveFiles: GoogleDriveFile[] = data.docs
              .map((doc: { id: string; name: string; mimeType: string; sizeBytes?: number }) => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes || 0,
              }))
              .filter((doc: GoogleDriveFile) =>
                SUPPORTED_MIME_TYPES.includes(doc.mimeType) ||
                doc.mimeType.startsWith('text/')
              );

            setSelectedFiles(driveFiles);
            onFilesSelected?.(driveFiles);
          } else if (data.action === 'cancel') {
            setPickerState('idle');
          }

          setTimeout(() => setPickerState('completed'), 300);
        },
      });
    }, 100);
  }, [openPicker, onFilesSelected, onError]);

  /**
   * Telecharge un fichier Google Drive via l'API
   */
  const downloadFile = useCallback(
    async (fileId: string, accessToken: string): Promise<Blob | null> => {
      try {
        const file = selectedFiles.find((f) => f.id === fileId);
        if (!file) return null;

        // Pour les fichiers Google Docs, on exporte en format approprie
        let url: string;
        let exportMimeType: string | undefined;

        if (file.mimeType === 'application/vnd.google-apps.document') {
          url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
          exportMimeType = 'application/pdf';
        } else if (file.mimeType === 'application/vnd.google-apps.presentation') {
          url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
          exportMimeType = 'application/pdf';
        } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
          url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
          exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
          url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const blob = await response.blob();
        return exportMimeType ? new Blob([blob], { type: exportMimeType }) : blob;
      } catch (error) {
        onError?.(error as Error);
        return null;
      }
    },
    [selectedFiles, onError]
  );

  const reset = useCallback(() => {
    setSelectedFiles([]);
    setPickerState('idle');
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    pickerState,
    selectedFiles,
    handleOpenPicker,
    downloadFile,
    reset,
  };
}
