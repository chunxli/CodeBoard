type Job = () => Promise<void>;

/**
 * Runs are keyed by repoId: at most one run per repo executes at a time (they share a single
 * git working directory, so concurrent runs on the same repo would corrupt each other's
 * checkout/branch state), but runs on different repos are free to execute in parallel, up to
 * an overall concurrency cap.
 */
class JobQueue {
  private keyQueues = new Map<string, Job[]>();
  private activeKeys = new Set<string>();
  private globalRunning = 0;

  constructor(private readonly concurrency: number) {}

  enqueue(key: string, job: Job) {
    const queue = this.keyQueues.get(key);
    if (queue) {
      queue.push(job);
    } else {
      this.keyQueues.set(key, [job]);
    }
    this.drain();
  }

  private drain() {
    if (this.globalRunning >= this.concurrency) return;
    for (const [key, queue] of this.keyQueues) {
      if (this.globalRunning >= this.concurrency) break;
      if (this.activeKeys.has(key)) continue;

      const job = queue.shift();
      if (!job) {
        this.keyQueues.delete(key);
        continue;
      }

      this.activeKeys.add(key);
      this.globalRunning++;
      job()
        .catch((err) => console.error("[job-queue] job failed:", err))
        .finally(() => {
          this.globalRunning--;
          this.activeKeys.delete(key);
          if (this.keyQueues.get(key)?.length === 0) this.keyQueues.delete(key);
          this.drain();
        });
    }
  }
}

// Singleton across Next.js dev-mode hot reloads.
const globalForQueue = globalThis as unknown as { copilotJobQueue?: JobQueue };

export const jobQueue =
  globalForQueue.copilotJobQueue ?? new JobQueue(Number(process.env.RUN_CONCURRENCY ?? 2));

if (process.env.NODE_ENV !== "production") {
  globalForQueue.copilotJobQueue = jobQueue;
}

