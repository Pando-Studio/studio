/**
 * Jina Reader — free web scraping via r.jina.ai.
 *
 * Returns clean Markdown content for any URL.
 * Falls back to simple fetch + regex HTML stripping on failure.
 */

import type { WebScraper, ScrapedPage } from './types';

const JINA_READER_BASE = 'https://r.jina.ai';
const JINA_TIMEOUT_MS = 30_000;

/**
 * Extract a <title> from raw HTML (fallback helper).
 */
function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || 'Untitled';
}

/**
 * Strip HTML tags to plain text (fallback helper).
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback scraper: simple fetch + regex HTML stripping.
 * Used when Jina Reader fails.
 */
async function fallbackScrape(url: string): Promise<ScrapedPage> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const title = extractTitleFromHtml(html);
    const content = stripHtml(html);

    return {
      url,
      title,
      content,
      metadata: {},
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export class JinaReaderScraper implements WebScraper {
  async scrape(url: string): Promise<ScrapedPage> {
    try {
      return await this.scrapeWithJina(url);
    } catch (error: unknown) {
      console.warn(
        '[JinaReader] Jina scraping failed, falling back to direct fetch:',
        error instanceof Error ? error.message : String(error)
      );
      return fallbackScrape(url);
    }
  }

  private async scrapeWithJina(url: string): Promise<ScrapedPage> {
    const jinaUrl = `${JINA_READER_BASE}/${url}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS);

    try {
      const response = await fetch(jinaUrl, {
        headers: {
          Accept: 'application/json',
          'X-Return-Format': 'markdown',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Jina Reader HTTP ${response.status}: ${response.statusText}`);
      }

      const data: unknown = await response.json();

      // Jina returns { code, status, data: { title, content, ... } }
      const payload = data as {
        code?: number;
        data?: {
          title?: string;
          content?: string;
          author?: string;
          publishedDate?: string;
          language?: string;
        };
      };

      const pageData = payload.data;
      if (!pageData?.content) {
        throw new Error('Jina Reader returned empty content');
      }

      return {
        url,
        title: pageData.title || 'Untitled',
        content: pageData.content,
        metadata: {
          author: pageData.author || undefined,
          publishedDate: pageData.publishedDate || undefined,
          language: pageData.language || undefined,
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
