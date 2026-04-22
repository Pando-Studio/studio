/**
 * Web scraping interfaces for Studio source ingestion.
 */

export interface ScrapedPage {
  url: string;
  title: string;
  /** Clean Markdown content */
  content: string;
  metadata: {
    author?: string;
    publishedDate?: string;
    language?: string;
  };
}

export interface WebScraper {
  scrape(url: string): Promise<ScrapedPage>;
}
