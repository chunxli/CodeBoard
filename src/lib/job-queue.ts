type Job = () => Promise<void>;

class JobQueue {
  private queue: Job[] = [];
  private running = 0;
  constructor(private readonly concurrency: number) {}

  enqueue(job: Job) {
    this.queue.push(job);
    this.drain();
  }

  private drain() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.running++;
      job()
        .catch((err) => console.error("[job-queue] job failed:", err))
        .finally(() => {
          this.running--;
          this.drain();
        });
    }
  }
}

// Singleton across Next.js dev-mode hot reloads.
const globalForQueue = globalThis as unknown as { copilotJobQueue?: JobQueue };

export const jobQueue =
  globalForQueue.copilotJobQueue ?? new JobQueue(Number(process.env.RUN_CONCURRENCY ?? 1));

if (process.env.NODE_ENV !== "production") {
  globalForQueue.copilotJobQueue = jobQueue;
}
