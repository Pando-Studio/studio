'use client';

import { useCallback, useEffect, useState } from 'react';

export interface DropboxFile {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
  thumbnailLink?: string;
  isDir: boolean;
}

interface UseDropboxProps {
  onFilesSelected?: (files: DropboxFile[]) => void;
  onError?: (error: Error) => void;
}

// Extensions supportees
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.xlsx', '.txt', '.md', '.html'];

// Declare Dropbox global type
declare global {
  interface Window {
    Dropbox?: {
      choose: (options: {
        success: (files: DropboxChooserFile[]) => void;
        cancel: () => void;
        linkType: 'direct' | 'preview';
        multiselect: boolean;
        extensions: string[];
        folderselect: boolean;
      }) => void;
    };
  }
}

interface DropboxChooserFile {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
  thumbnailLink?: string;
  isDir: boolean;
}

export function useDropbox({ onFilesSelected, onError }: UseDropboxProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Charger le script Dropbox Chooser dynamiquement
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
    if (!appKey) return;

    // Verifier si deja charge
    if (window.Dropbox) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
    script.id = 'dropboxjs';
    script.setAttribute('data-app-key', appKey);
    script.async = true;

    script.onload = () => {
      setIsScriptLoaded(true);
    };

    script.onerror = () => {
      onError?.(new Error('Erreur lors du chargement du SDK Dropbox'));
    };

    document.body.appendChild(script);

    return () => {
      // Ne pas retirer le script pour eviter les problemes de rechargement
    };
  }, [onError]);

  const openChooser = useCallback(() => {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;

    if (!appKey) {
      onError?.(new Error('Dropbox non configure'));
      return;
    }

    if (!isScriptLoaded || !window.Dropbox) {
      onError?.(new Error('SDK Dropbox non charge'));
      return;
    }

    setIsLoading(true);

    try {
      window.Dropbox.choose({
        success: (files: DropboxChooserFile[]) => {
          setIsLoading(false);

          const dropboxFiles: DropboxFile[] = files.map((f) => ({
            id: f.id,
            name: f.name,
            link: f.link,
            bytes: f.bytes,
            icon: f.icon,
            thumbnailLink: f.thumbnailLink,
            isDir: f.isDir,
          }));

          onFilesSelected?.(dropboxFiles);
        },
        cancel: () => {
          setIsLoading(false);
        },
        linkType: 'direct', // URL de telechargement direct
        multiselect: true,
        extensions: SUPPORTED_EXTENSIONS,
        folderselect: false,
      });
    } catch (error) {
      setIsLoading(false);
      onError?.(error as Error);
    }
  }, [isScriptLoaded, onFilesSelected, onError]);

  return {
    isLoading,
    isScriptLoaded,
    openChooser,
  };
}
