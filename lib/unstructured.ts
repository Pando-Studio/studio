import FormData from 'form-data';

const UNSTRUCTURED_API_URL = 'https://api.unstructuredapp.io/general/v0/general';
const DOCLING_URL = process.env.DOCLING_URL || '';

export interface DocumentChunk {
  text: string;
  type: string;
  metadata: {
    page_number?: number;
    filename?: string;
    section_title?: string;
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
}

/**
 * Retry a function with exponential backoff.
 * Only retries on network errors or 5xx responses (not 4xx).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = isRetryableError(error);

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `[Unstructured] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms:`,
        error instanceof Error ? error.message : String(error)
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('withRetry: unexpected code path');
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof UnstructuredApiError) {
    return error.statusCode >= 500;
  }
  return false;
}

class UnstructuredApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'UnstructuredApiError';
  }
}

interface UnstructuredElement {
  type: string;
  text: string;
  metadata: {
    filename?: string;
    filetype?: string;
    page_number?: number;
    languages?: string[];
    parent_id?: string;
    category_depth?: number;
    [key: string]: unknown;
  };
  element_id: string;
}

// Map file extensions to MIME types
const mimeTypes: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
};

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return mimeTypes[ext] ?? 'application/octet-stream';
}

export async function parseDocument(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<DocumentChunk[]> {
  const apiKey = process.env.UNSTRUCTURED_API_KEY;
  if (!apiKey) {
    throw new Error('UNSTRUCTURED_API_KEY is not configured');
  }

  console.log('[Unstructured] Starting parseDocument for:', originalFilename);

  const filename = originalFilename;
  const contentType = getMimeType(filename);

  console.log(
    `[Unstructured] File: ${filename}, size: ${fileBuffer.length} bytes, type: ${contentType}`
  );

  // Prepare FormData for Unstructured.io API
  const formData = new FormData();
  formData.append('files', fileBuffer, {
    filename,
    contentType,
  });

  // Send to Unstructured.io API
  console.log('[Unstructured] Calling Unstructured API...');
  const apiResponse = await fetch(UNSTRUCTURED_API_URL, {
    method: 'POST',
    headers: {
      'unstructured-api-key': apiKey,
      ...formData.getHeaders(),
    },
    body: formData.getBuffer() as unknown as BodyInit,
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`Unstructured API error: ${apiResponse.status} - ${errorText}`);
  }

  const elements: UnstructuredElement[] = await apiResponse.json();
  console.log(`[Unstructured] API response received: ${elements.length} elements`);

  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error('No content extracted from document');
  }

  // Transform elements to chunks
  return elements.map((element) => ({
    text: element.text || '',
    type: element.type || 'unknown',
    metadata: {
      page_number: element.metadata?.page_number,
      filename: element.metadata?.filename,
      ...element.metadata,
    },
  }));
}

// ---------------------------------------------------------------------------
// Docling parsing (self-hosted, Unstructured-compatible output)
// ---------------------------------------------------------------------------

interface DoclingResponse {
  elements: Array<{
    type: string;
    text: string;
    metadata: {
      page_number?: number;
      filename?: string;
      [key: string]: unknown;
    };
  }>;
  metadata: {
    pages: number;
    language: string | null;
    filename: string;
  };
}

/**
 * Parse a document using the self-hosted Docling service.
 * Returns the same DocumentChunk[] format as parseDocument() for full compatibility.
 *
 * @throws Error if DOCLING_URL is not configured or the service is unreachable
 */
export async function parseWithDocling(
  fileBuffer: Buffer,
  originalFilename: string,
  options: { strategy?: 'fast' | 'accurate' } = {}
): Promise<DocumentChunk[]> {
  if (!DOCLING_URL) {
    throw new Error('DOCLING_URL is not configured');
  }

  const { strategy = 'accurate' } = options;

  console.log('[Docling] Starting parseWithDocling for:', originalFilename);

  const contentType = getMimeType(originalFilename);

  const formData = new FormData();
  formData.append('file', fileBuffer, {
    filename: originalFilename,
    contentType,
  });
  formData.append('strategy', strategy);

  console.log(
    `[Docling] File: ${originalFilename}, size: ${fileBuffer.length} bytes, type: ${contentType}, strategy: ${strategy}`
  );

  const controller = new AbortController();
  // 5 minute timeout — Docling can be slow on large PDFs
  const timeoutMs = 5 * 60 * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${DOCLING_URL}/parse`, {
      method: 'POST',
      headers: formData.getHeaders(),
      body: formData.getBuffer() as unknown as BodyInit,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Docling API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as DoclingResponse;

    console.log(`[Docling] Response received: ${data.elements.length} elements`);

    if (!data.elements || data.elements.length === 0) {
      throw new Error('No content extracted from document by Docling');
    }

    return data.elements.map((element) => ({
      text: element.text || '',
      type: element.type || 'unknown',
      metadata: {
        page_number: element.metadata?.page_number,
        filename: element.metadata?.filename,
        ...element.metadata,
      },
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if the Docling service is available and healthy.
 */
export async function isDoclingAvailable(): Promise<boolean> {
  if (!DOCLING_URL) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${DOCLING_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = (await response.json()) as { status: string };
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Smart document parsing: uses Docling if available, falls back to Unstructured.io.
 * This is the recommended entry point for document parsing.
 */
export async function smartParseDocument(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<DocumentChunk[]> {
  // Try Docling first if configured
  if (DOCLING_URL) {
    try {
      const doclingAvailable = await isDoclingAvailable();
      if (doclingAvailable) {
        console.log('[SmartParse] Using Docling for:', originalFilename);
        return await parseWithDocling(fileBuffer, originalFilename);
      }
      console.warn('[SmartParse] Docling configured but not available, falling back to Unstructured');
    } catch (error: unknown) {
      console.warn(
        '[SmartParse] Docling failed, falling back to Unstructured:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Fallback to Unstructured.io
  console.log('[SmartParse] Using Unstructured.io for:', originalFilename);
  return parseDocument(fileBuffer, originalFilename);
}

/**
 * Chunking strategies pour RAG
 */
export interface ChunkingOptions {
  chunkSize?: number; // Taille cible des chunks en caracteres
  chunkOverlap?: number; // Overlap entre chunks
  strategy?: 'semantic' | 'fixed' | 'paragraph';
}

export function chunkText(text: string, options: ChunkingOptions = {}): string[] {
  const { chunkSize = 1000, chunkOverlap = 200, strategy = 'paragraph' } = options;

  if (strategy === 'paragraph') {
    // Split by paragraphs, merge small ones
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
    const chunks: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep overlap
        currentChunk = currentChunk.slice(-chunkOverlap) + '\n\n' + para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Fixed size chunking
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - chunkOverlap;
  }

  return chunks;
}

export async function parseDocumentForRAG(
  fileBuffer: Buffer,
  originalFilename: string,
  options?: ChunkingOptions
): Promise<DocumentChunk[]> {
  // Parse document first
  const rawChunks = await parseDocument(fileBuffer, originalFilename);

  // Combine all text
  const fullText = rawChunks.map((c) => c.text).join('\n\n');

  // Re-chunk with our strategy
  const chunkedTexts = chunkText(fullText, options);

  return chunkedTexts.map((text, index) => ({
    text,
    type: 'chunk',
    metadata: {
      chunk_index: index,
      filename: originalFilename,
    },
  }));
}

// Unstructured element types that indicate section boundaries
const SECTION_BREAK_TYPES = new Set(['Title', 'Header']);
// Types that should be kept as isolated chunks
const ISOLATED_TYPES = new Set(['Table', 'Image', 'FigureCaption']);

/**
 * Structure-aware chunking that respects document structure from Unstructured.
 *
 * Instead of flattening all elements into plain text and re-chunking,
 * this function uses element types to create semantically coherent chunks:
 * - Title/Header elements start new sections
 * - Table elements are kept as isolated chunks
 * - NarrativeText, ListItem, etc. are accumulated within sections
 * - Oversized sections are split with overlap
 */
export function structureAwareChunk(
  elements: DocumentChunk[],
  options: ChunkingOptions & { maxChunkSize?: number } = {}
): DocumentChunk[] {
  const { maxChunkSize = 1500, chunkOverlap = 200 } = options;

  if (elements.length === 0) return [];

  const chunks: DocumentChunk[] = [];
  let currentTexts: string[] = [];
  let currentTypes: string[] = [];
  let currentPage: number | undefined;
  let currentFilename: string | undefined;
  let currentSectionTitle: string | undefined;
  let chunkIndex = 0;

  /** Prepend section title to chunk text for better embedding context */
  function withSectionPrefix(text: string): string {
    if (!currentSectionTitle) return text;
    if (text.startsWith(currentSectionTitle)) return text;
    return `[Section: ${currentSectionTitle}] ${text}`;
  }

  function flushCurrentChunk() {
    if (currentTexts.length === 0) return;

    const fullText = currentTexts.join('\n\n');
    const typesSummary = [...new Set(currentTypes)].join('+');

    // If the chunk is within size limit, emit as-is
    if (fullText.length <= maxChunkSize) {
      chunks.push({
        text: withSectionPrefix(fullText),
        type: typesSummary,
        metadata: {
          chunk_index: chunkIndex++,
          page_number: currentPage,
          filename: currentFilename,
          element_types: [...new Set(currentTypes)],
          section_title: currentSectionTitle,
        },
      });
    } else {
      // Split oversized sections using paragraph chunking with overlap
      const subChunks = chunkText(fullText, {
        chunkSize: maxChunkSize,
        chunkOverlap,
        strategy: 'paragraph',
      });
      for (const sub of subChunks) {
        chunks.push({
          text: withSectionPrefix(sub),
          type: typesSummary,
          metadata: {
            chunk_index: chunkIndex++,
            page_number: currentPage,
            filename: currentFilename,
            element_types: [...new Set(currentTypes)],
            section_title: currentSectionTitle,
          },
        });
      }
    }

    currentTexts = [];
    currentTypes = [];
  }

  for (const element of elements) {
    const text = element.text?.trim();
    if (!text) continue;

    const elType = element.type || 'unknown';
    const page = element.metadata?.page_number;
    const filename = element.metadata?.filename;

    // Set filename from first element
    if (!currentFilename && filename) {
      currentFilename = filename as string;
    }

    // Track section title for context
    if (SECTION_BREAK_TYPES.has(elType)) {
      currentSectionTitle = text;
    }

    // Isolated types (Table, Image) get their own chunk
    if (ISOLATED_TYPES.has(elType)) {
      flushCurrentChunk();
      chunks.push({
        text: withSectionPrefix(text),
        type: elType,
        metadata: {
          chunk_index: chunkIndex++,
          page_number: page,
          filename: currentFilename,
          element_types: [elType],
          section_title: currentSectionTitle,
        },
      });
      currentPage = page;
      continue;
    }

    // Section break types (Title, Header) start a new chunk
    if (SECTION_BREAK_TYPES.has(elType) && currentTexts.length > 0) {
      flushCurrentChunk();
    }

    // Check if adding this element would exceed max size
    const currentLength = currentTexts.reduce((sum, t) => sum + t.length + 2, 0);
    if (currentLength + text.length > maxChunkSize && currentTexts.length > 0) {
      flushCurrentChunk();
    }

    currentTexts.push(text);
    currentTypes.push(elType);
    if (page !== undefined) {
      currentPage = page;
    }
  }

  // Flush remaining
  flushCurrentChunk();

  return chunks;
}
