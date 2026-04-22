import { NextResponse } from 'next/server';
import { Queue, Job } from 'bullmq';
import { connectionOptions } from '@/lib/queue/connection';

type RouteParams = { params: Promise<{ jobId: string }> };

// Map queue names to their instances
const queues: Record<string, Queue> = {};

function getQueue(queueName: string): Queue {
  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, { connection: connectionOptions });
  }
  return queues[queueName];
}

// All studio queue names
const STUDIO_QUEUES = [
  'studio-source-analysis',
  'studio-widget-generation',
  'studio-presentation-generation',
  'studio-course-plan-generation',
];

interface JobProgress {
  progress: number;
  step: string;
  label: string;
}

// GET /api/queue/jobs/[jobId] - Get job status and progress
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params;

    // Search for the job across all queues
    let job: Job | undefined;
    let queueName: string | undefined;

    for (const qName of STUDIO_QUEUES) {
      const queue = getQueue(qName);
      const foundJob = await queue.getJob(jobId);
      if (foundJob) {
        job = foundJob;
        queueName = qName;
        break;
      }
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const state = await job.getState();
    const progress = job.progress as JobProgress | number;

    // Normalize progress to object format
    const normalizedProgress: JobProgress = typeof progress === 'number'
      ? { progress, step: 'processing', label: 'En cours...' }
      : progress || { progress: 0, step: 'pending', label: 'En attente...' };

    // Build response
    const response: Record<string, unknown> = {
      jobId: job.id,
      queueName,
      state,
      progress: normalizedProgress.progress,
      step: normalizedProgress.step,
      label: normalizedProgress.label,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };

    // Include result data if completed
    if (state === 'completed' && job.returnvalue) {
      response.result = job.returnvalue;
    }

    // Include error if failed
    if (state === 'failed' && job.failedReason) {
      response.error = job.failedReason;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
