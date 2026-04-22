/**
 * Google Drive API client for browsing and downloading files.
 *
 * Uses the Google Drive v3 REST API directly (no SDK dependency).
 * Requires a valid OAuth2 access token with `drive.readonly` scope.
 */

import { logger } from '@/lib/monitoring/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
  iconLink?: string;
  webViewLink?: string;
}

export interface ListFilesOptions {
  folderId?: string;
  pageToken?: string;
  mimeTypes?: string[];
  pageSize?: number;
}

export interface ListFilesResult {
  files: DriveFile[];
  nextPageToken?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

/** Google Workspace MIME types that need export (not direct download). */
const GOOGLE_MIME_EXPORT_MAP: Record<string, { exportMime: string; extension: string }> = {
  'application/vnd.google-apps.document': {
    exportMime: 'application/pdf',
    extension: 'pdf',
  },
  'application/vnd.google-apps.spreadsheet': {
    exportMime: 'text/csv',
    extension: 'csv',
  },
  'application/vnd.google-apps.presentation': {
    exportMime: 'application/pdf',
    extension: 'pdf',
  },
};

/** MIME types we allow the user to browse / import. */
const BROWSABLE_MIME_TYPES = [
  // Google native types
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  // Standard file types
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'image/png',
  'image/jpeg',
  'image/webp',
];

/** Folder MIME type. */
const FOLDER_MIME = 'application/vnd.google-apps.folder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

async function driveRequest<T>(
  url: string,
  accessToken: string,
): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(accessToken) });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('Google Drive API error', {
      status: res.status,
      url,
      error: body,
    });
    throw new Error(`Google Drive API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List files and folders visible to the user.
 */
export async function listFiles(
  accessToken: string,
  options: ListFilesOptions = {},
): Promise<ListFilesResult> {
  const {
    folderId,
    pageToken,
    mimeTypes = BROWSABLE_MIME_TYPES,
    pageSize = 50,
  } = options;

  // Build the `q` query parameter.
  const qParts: string[] = ['trashed = false'];

  if (folderId) {
    qParts.push(`'${folderId}' in parents`);
  }

  // Include folders so the user can navigate + the allowed file types
  const mimeFilter = [
    `mimeType = '${FOLDER_MIME}'`,
    ...mimeTypes.map((m) => `mimeType = '${m}'`),
  ].join(' or ');
  qParts.push(`(${mimeFilter})`);

  const params = new URLSearchParams({
    q: qParts.join(' and '),
    fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size,parents,iconLink,webViewLink)',
    orderBy: 'folder,name',
    pageSize: String(pageSize),
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const data = await driveRequest<{
    files?: DriveFile[];
    nextPageToken?: string;
  }>(`${DRIVE_API}/files?${params.toString()}`, accessToken);

  return {
    files: data.files ?? [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Retrieve metadata for a single file.
 */
export async function getFileMetadata(
  accessToken: string,
  fileId: string,
): Promise<DriveFile> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime,size,parents,iconLink,webViewLink',
    supportsAllDrives: 'true',
  });

  return driveRequest<DriveFile>(
    `${DRIVE_API}/files/${fileId}?${params.toString()}`,
    accessToken,
  );
}

/**
 * Download a file from Google Drive.
 *
 * - For Google Workspace files (Docs, Sheets, Slides), uses the export endpoint.
 * - For all other files, downloads directly.
 *
 * Returns a Buffer, the resolved MIME type, and the filename (with correct extension).
 */
export async function downloadFile(
  accessToken: string,
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  // First, grab metadata to know the type + name
  const meta = await getFileMetadata(accessToken, fileId);

  const exportInfo = GOOGLE_MIME_EXPORT_MAP[meta.mimeType];

  let downloadUrl: string;
  let resolvedMime: string;
  let resolvedName: string;

  if (exportInfo) {
    // Google Workspace file => export
    downloadUrl = `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportInfo.exportMime)}`;
    resolvedMime = exportInfo.exportMime;
    // Replace or append the correct extension
    const baseName = meta.name.replace(/\.[^.]+$/, '');
    resolvedName = `${baseName}.${exportInfo.extension}`;
  } else {
    // Regular file => direct download
    downloadUrl = `${DRIVE_API}/files/${fileId}?alt=media`;
    resolvedMime = meta.mimeType;
    resolvedName = meta.name;
  }

  const res = await fetch(downloadUrl, { headers: authHeaders(accessToken) });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('Google Drive download error', {
      status: res.status,
      fileId,
      error: body,
    });
    throw new Error(`Failed to download file ${fileId}: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  return { buffer, mimeType: resolvedMime, filename: resolvedName };
}

/**
 * Check whether a MIME type represents a folder.
 */
export function isFolder(mimeType: string): boolean {
  return mimeType === FOLDER_MIME;
}
