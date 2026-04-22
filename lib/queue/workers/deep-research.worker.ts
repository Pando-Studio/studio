import { Worker, Job } from 'bullmq';
import { generateText } from 'ai';
import { prisma } from '@/lib/db';
import { connectionOptions } from '../connection';
import type { DeepResearchJob, DeepResearchResult, SourceAnalysisJob } from '../queues';
import { getSourceAnalysisQueue } from '../queues';
import { getProviderForStudio } from '../../ai/providers';
import { createScraper } from '../../scraping';
import { publishStudioEvent } from '../../events/studio-events';

// ---------------------------------------------------------------------------
// Search placeholder
// ---------------------------------------------------------------------------

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Web search placeholder.
 * TODO: Integrate a real search API (Serper, Brave Search, Tavily, etc.)
 */
async function searchWeb(_query: string): Promise<SearchResult[]> {
  // TODO: Implement real web search
  console.warn('[DeepResearch] searchWeb is a placeholder — returning empty results');
  return [];
}

// ---------------------------------------------------------------------------
// Deep research pipeline
// ---------------------------------------------------------------------------

const MAX_PAGES_STANDARD = 5;
const MAX_PAGES_DEEP = 15;
const RELEVANCE_THRESHOLD = 6;

async function processDeepResearch(
  job: Job<DeepResearchJob>
): Promise<DeepResearchResult> {
  const { runId, studioId, query, language, depth } = job.data;
  const maxPages = depth === 'deep' ? MAX_PAGES_DEEP : MAX_PAGES_STANDARD;

  console.log(`[DeepResearch] Starting run ${runId}: "${query}" (${depth}, ${language})`);

  try {
    // Update status: searching
    await prisma.deepResearchRun.update({
      where: { id: runId },
      data: { status: 'searching' },
    });
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'searching',
      step: 'Generating search queries...',
    });

    await job.updateProgress(10);

    // --- Step 1: Generate diverse search queries via LLM ---
    let model: Awaited<ReturnType<typeof getProviderForStudio>>['model'];
    try {
      const resolved = await getProviderForStudio(studioId, 'google');
      model = resolved.model;
    } catch {
      throw new Error('No LLM provider available for deep research');
    }

    const { text: queriesRaw } = await generateText({
      model,
      system:
        language === 'fr'
          ? 'Tu es un assistant de recherche. Genere 3 a 5 requetes de recherche web variees pour explorer un sujet en profondeur. Reponds uniquement avec les requetes, une par ligne, sans numerotation.'
          : 'You are a research assistant. Generate 3 to 5 varied web search queries to explore a topic in depth. Reply only with the queries, one per line, without numbering.',
      prompt: query,
      maxOutputTokens: 300,
      temperature: 0.7,
    });

    const searchQueries = queriesRaw
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 5);

    console.log(`[DeepResearch] Generated ${searchQueries.length} search queries`);
    await job.updateProgress(20);

    // --- Step 2: Search the web for each query ---
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'searching',
      step: `Searching the web (${searchQueries.length} queries)...`,
    });

    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const sq of searchQueries) {
      const results = await searchWeb(sq);
      for (const r of results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }
    }

    console.log(`[DeepResearch] Found ${allResults.length} unique URLs`);
    await job.updateProgress(30);

    // --- Step 3: Scrape top results ---
    await prisma.deepResearchRun.update({
      where: { id: runId },
      data: { status: 'scraping', pagesFound: allResults.length },
    });
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'scraping',
      step: `Scraping ${Math.min(allResults.length, maxPages)} pages...`,
      pagesFound: allResults.length,
    });

    const scraper = createScraper();
    const scrapedPages: Array<{
      url: string;
      title: string;
      content: string;
      score: number;
    }> = [];

    const pagesToScrape = allResults.slice(0, maxPages);

    for (let i = 0; i < pagesToScrape.length; i++) {
      const result = pagesToScrape[i];
      try {
        const page = await scraper.scrape(result.url);
        if (page.content.length > 100) {
          scrapedPages.push({
            url: page.url,
            title: page.title,
            content: page.content,
            score: 0, // Will be scored in step 4
          });
        }
      } catch (error: unknown) {
        console.warn(
          `[DeepResearch] Failed to scrape ${result.url}:`,
          error instanceof Error ? error.message : String(error)
        );
      }

      await job.updateProgress(30 + Math.round((i / pagesToScrape.length) * 20));
    }

    console.log(`[DeepResearch] Successfully scraped ${scrapedPages.length} pages`);

    // --- Step 4: Evaluate relevance of each page via LLM ---
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'scraping',
      step: `Evaluating relevance of ${scrapedPages.length} pages...`,
    });

    for (let i = 0; i < scrapedPages.length; i++) {
      const page = scrapedPages[i];
      try {
        const { text: scoreRaw } = await generateText({
          model,
          system:
            language === 'fr'
              ? 'Tu es un evaluateur de pertinence. Evalue la pertinence du contenu par rapport a la requete de recherche. Reponds uniquement avec un nombre entier entre 0 et 10.'
              : 'You are a relevance evaluator. Rate the relevance of the content to the research query. Reply only with an integer between 0 and 10.',
          prompt: `Query: "${query}"\n\nPage title: "${page.title}"\nContent (first 2000 chars): "${page.content.slice(0, 2000)}"`,
          maxOutputTokens: 5,
          temperature: 0,
        });

        const score = parseInt(scoreRaw.trim(), 10);
        page.score = isNaN(score) ? 5 : Math.min(10, Math.max(0, score));
      } catch {
        page.score = 5; // Default to neutral on LLM failure
      }
    }

    await job.updateProgress(60);

    // --- Step 5: Retain pages with score >= threshold ---
    const retainedPages = scrapedPages.filter((p) => p.score >= RELEVANCE_THRESHOLD);
    console.log(
      `[DeepResearch] Retained ${retainedPages.length}/${scrapedPages.length} pages (threshold: ${RELEVANCE_THRESHOLD})`
    );

    // --- Step 6: Create StudioSource entries and enqueue indexation ---
    await prisma.deepResearchRun.update({
      where: { id: runId },
      data: { status: 'indexing', pagesRetained: retainedPages.length },
    });
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'indexing',
      step: `Indexing ${retainedPages.length} relevant pages...`,
      pagesRetained: retainedPages.length,
    });

    const sourceQueue = getSourceAnalysisQueue();

    for (const page of retainedPages) {
      const source = await prisma.studioSource.create({
        data: {
          studioId,
          type: 'WEB',
          title: page.title,
          url: page.url,
          status: 'PENDING',
          metadata: {
            fromDeepResearch: true,
            runId,
            relevanceScore: page.score,
          },
        },
      });

      await sourceQueue.add(
        'analyze-source',
        {
          sourceId: source.id,
          studioId,
          filename: page.title,
          url: page.url,
          type: 'WEB',
        } satisfies SourceAnalysisJob,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    }

    await job.updateProgress(80);

    // --- Step 7: Generate summary of discoveries ---
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'indexing',
      step: 'Generating research summary...',
    });

    let summary = '';
    if (retainedPages.length > 0) {
      const pagesOverview = retainedPages
        .map((p) => `- ${p.title} (score: ${p.score}/10): ${p.content.slice(0, 300)}...`)
        .join('\n');

      try {
        const { text: summaryText } = await generateText({
          model,
          system:
            language === 'fr'
              ? 'Tu es un assistant de recherche. Resume les decouvertes en 3-5 points cles. Sois concis et informatif.'
              : 'You are a research assistant. Summarize the discoveries in 3-5 key points. Be concise and informative.',
          prompt: `Research query: "${query}"\n\nPages found:\n${pagesOverview}`,
          maxOutputTokens: 500,
          temperature: 0.3,
        });
        summary = summaryText;
      } catch {
        summary = `${retainedPages.length} relevant pages found and indexed.`;
      }
    } else {
      summary =
        language === 'fr'
          ? 'Aucune page pertinente trouvee pour cette recherche.'
          : 'No relevant pages found for this search.';
    }

    // --- Complete ---
    await prisma.deepResearchRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        pagesFound: allResults.length,
        pagesRetained: retainedPages.length,
        summary,
        completedAt: new Date(),
      },
    });
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'completed',
      summary,
      pagesFound: allResults.length,
      pagesRetained: retainedPages.length,
    });

    await job.updateProgress(100);

    console.log(`[DeepResearch] Run ${runId} completed successfully`);

    return {
      success: true,
      runId,
      pagesFound: allResults.length,
      pagesRetained: retainedPages.length,
      summary,
    };
  } catch (error: unknown) {
    console.error(`[DeepResearch] Run ${runId} failed:`, error);

    await prisma.deepResearchRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });
    await publishStudioEvent(studioId, 'research:progress', {
      runId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }).catch(() => {});

    return {
      success: false,
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function createDeepResearchWorker() {
  const worker = new Worker<DeepResearchJob, DeepResearchResult>(
    'studio-deep-research',
    processDeepResearch,
    {
      connection: connectionOptions,
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[DeepResearch] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[DeepResearch] Job ${job?.id} failed:`, err);
  });

  return worker;
}
