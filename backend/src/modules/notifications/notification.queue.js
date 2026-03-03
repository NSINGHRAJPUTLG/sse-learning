const logger = require('../../utils/logger');
const { renderTemplate } = require('./notification.templates');

const RETRY_LIMIT = 3;
const BASE_BACKOFF_MS = 200;

const jobs = [];
const stats = {
  totalQueued: 0,
  totalProcessed: 0,
  totalFailed: 0,
};

let processing = false;

async function mockSendEmail(job) {
  if (job.forceFailTimes && job.failedAttempts < job.forceFailTimes) {
    throw new Error('Forced email failure for retry testing');
  }
  const rendered = renderTemplate(job.template, job.data);
  logger.info(
    {
      to: job.to,
      subject: job.subject || rendered.subject,
      template: job.template,
    },
    'Email dispatched (mock)'
  );
}

function addEmailJob(payload) {
  const job = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    queue: 'emailQueue',
    ...payload,
    failedAttempts: 0,
    lastError: null,
  };

  jobs.push(job);
  stats.totalQueued += 1;
  setImmediate(processQueue);
  return job;
}

async function processJob(job) {
  try {
    await mockSendEmail(job);
    stats.totalProcessed += 1;
  } catch (error) {
    job.failedAttempts += 1;
    job.lastError = String(error.message || error);

    if (job.failedAttempts >= RETRY_LIMIT) {
      stats.totalFailed += 1;
      logger.error({ jobId: job.id, error: job.lastError }, 'Email job permanently failed');
      return;
    }

    const backoffMs = BASE_BACKOFF_MS * 2 ** (job.failedAttempts - 1);
    logger.warn({ jobId: job.id, attempt: job.failedAttempts, backoffMs }, 'Email job retry scheduled');
    setTimeout(() => {
      jobs.unshift(job);
      setImmediate(processQueue);
    }, backoffMs);
  }
}

async function processQueue() {
  if (processing) return;
  processing = true;

  try {
    while (jobs.length > 0) {
      const job = jobs.shift();
      // eslint-disable-next-line no-await-in-loop
      await processJob(job);
    }
  } finally {
    processing = false;
  }
}

function getQueueStats() {
  return {
    ...stats,
    pending: jobs.length,
  };
}

function resetQueueStats() {
  jobs.length = 0;
  stats.totalQueued = 0;
  stats.totalProcessed = 0;
  stats.totalFailed = 0;
}

module.exports = {
  addEmailJob,
  getQueueStats,
  resetQueueStats,
};
