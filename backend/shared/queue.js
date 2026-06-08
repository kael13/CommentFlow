import Bull from 'bull';
import crypto from 'node:crypto';
import { logger } from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const LLM_RATE_LIMIT_RPM = parseInt(process.env.LLM_RATE_LIMIT_RPM, 10) || 20;
const LLM_JOB_TIMEOUT_MS = parseInt(process.env.LLM_JOB_TIMEOUT_MS, 10) || 30000;

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

export function createQueue(name, options = {}) {
  const queue = new Bull(name, REDIS_URL, {
    ...options,
    limiter: {
      max: LLM_RATE_LIMIT_RPM,
      duration: 60000,
    },
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      ...(options.defaultJobOptions || {}),
    },
  });

  logger.info('Queue created', { queue: name });
  return queue;
}

export function createWorker(queue, processor) {
  queue.process(async (job) => {
    return await processor(job);
  });

  queue.on('completed', (job, result) => {
    logger.info('Job completed', { queue: queue.name, jobId: job.id });
  });

  queue.on('failed', (job, err) => {
    logger.error('Job failed', {
      queue: queue.name,
      jobId: job.id,
      error: err,
    });
  });

  queue.on('error', (err) => {
    logger.error('Queue error', { queue: queue.name, error: err });
  });

  return queue;
}

export async function enqueueJob(queue, data, options = {}) {
  const jobOpts = {};

  if (options.jobId) {
    jobOpts.jobId = options.jobId;
  }
  if (options.priority !== undefined) {
    jobOpts.priority = options.priority;
  }
  if (options.delay !== undefined) {
    jobOpts.delay = options.delay;
  }

  const job = await queue.add(data, jobOpts);
  logger.info('Job enqueued', { queue: queue.name, jobId: job.id });
  return job;
}

export async function enqueueAndWait(queue, data, timeoutMs = 30000) {
  const jobId = crypto.randomUUID();
  const job = await enqueueJob(queue, data, { jobId });

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const state = await job.getState();

    if (state === 'completed') {
      const result = await job.returnvalue;
      await job.remove();
      return result;
    }

    if (state === 'failed') {
      const err = new Error(`Job ${jobId} failed`);
      await job.remove();
      throw err;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await job.remove();
  throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
}

export async function getQueueStats(queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function shutdownQueues(queues) {
  logger.info('Shutting down queues', { count: queues.length });

  await Promise.all(
    queues.map(async (queue) => {
      try {
        await queue.close(5000);
      } catch (err) {
        logger.error('Error closing queue', { queue: queue.name, error: err });
      }
    })
  );

  logger.info('All queues shut down');
}
