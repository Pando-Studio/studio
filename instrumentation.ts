export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // BYOK encryption key check
    const byokKey = process.env.BYOK_ENCRYPTION_KEY;
    if (!byokKey || byokKey === 'default-dev-key-change-in-prod') {
      const isProduction = process.env.NODE_ENV === 'production';
      const level = isProduction ? 'ERROR' : 'WARN';
      console.warn(
        `[Studio] ${level}: BYOK_ENCRYPTION_KEY is not set or using default value. ` +
        'BYOK API keys will not be securely encrypted. ' +
        'Set a strong BYOK_ENCRYPTION_KEY (min 16 chars) in your environment.'
      );
    }

    // Import and start workers
    const { createSourceAnalysisWorker } = await import(
      './lib/queue/workers/analyze-source.worker'
    );
    const { startPresentationV2GenerationWorker: startPresentationGenerationWorker } = await import(
      './lib/queue/workers/generate-presentation.worker'
    );
    const { createCoursePlanGenerationWorker } = await import(
      './lib/queue/workers/generate-course-plan.worker'
    );
    const { createWidgetGenerationWorker } = await import(
      './lib/queue/workers/generate-widget.worker'
    );
    const { createDeepResearchWorker } = await import(
      './lib/queue/workers/deep-research.worker'
    );

    const sourceWorker = createSourceAnalysisWorker();
    const presentationWorker = startPresentationGenerationWorker();
    const coursePlanWorker = createCoursePlanGenerationWorker();
    const widgetWorker = createWidgetGenerationWorker();
    const deepResearchWorker = createDeepResearchWorker();

    console.log('[Studio] BullMQ workers started:', [
      sourceWorker.name,
      presentationWorker.name,
      coursePlanWorker.name,
      widgetWorker.name,
      deepResearchWorker.name,
    ].join(', '));
  }
}
