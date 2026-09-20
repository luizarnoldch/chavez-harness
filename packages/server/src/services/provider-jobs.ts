import { randomBytes } from "node:crypto";

export type ProviderJob = {
  jobId: string;
  userId: string;
  provider: string;
  unwrapToken: string;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60_000;

export function createProviderJobStore(ttlMs = DEFAULT_TTL_MS) {
  const jobs = new Map<string, ProviderJob>();

  function purgeExpired() {
    const now = Date.now();
    for (const [id, job] of jobs) {
      if (job.expiresAt <= now) jobs.delete(id);
    }
  }

  return {
    create(userId: string, provider: string): ProviderJob {
      purgeExpired();
      const job: ProviderJob = {
        jobId: crypto.randomUUID(),
        userId,
        provider,
        unwrapToken: randomBytes(24).toString("base64url"),
        expiresAt: Date.now() + ttlMs,
      };
      jobs.set(job.jobId, job);
      return job;
    },

    /** One-shot consume: returns job if token matches, then deletes. */
    consume(jobId: string, unwrapToken: string): ProviderJob | null {
      purgeExpired();
      const job = jobs.get(jobId);
      if (!job) return null;
      if (job.unwrapToken !== unwrapToken) return null;
      jobs.delete(jobId);
      return job;
    },

    peek(jobId: string): ProviderJob | undefined {
      purgeExpired();
      return jobs.get(jobId);
    },

    size() {
      purgeExpired();
      return jobs.size;
    },
  };
}

export type ProviderJobStore = ReturnType<typeof createProviderJobStore>;
