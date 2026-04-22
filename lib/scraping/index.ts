/**
 * Scraping factory.
 *
 * Returns the default WebScraper implementation (Jina Reader).
 */

export type { WebScraper, ScrapedPage } from './types';

import { JinaReaderScraper } from './jina-reader';
import type { WebScraper } from './types';

export function createScraper(): WebScraper {
  return new JinaReaderScraper();
}
