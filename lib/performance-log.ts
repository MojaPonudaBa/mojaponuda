export async function timed<T>(
  label: string,
  run: () => Promise<T> | PromiseLike<T>,
  options: { thresholdMs?: number; meta?: Record<string, string | number | boolean | null | undefined> } = {},
): Promise<T> {
  const start = Date.now();
  try {
    return await run();
  } finally {
    const durationMs = Date.now() - start;
    const thresholdMs = options.thresholdMs ?? 350;
    if (durationMs >= thresholdMs || process.env.LOG_QUERY_TIMINGS === "1") {
      const meta =
        options.meta && Object.keys(options.meta).length > 0
          ? ` ${JSON.stringify(options.meta)}`
          : "";
      console.info(`[perf] ${label} ${durationMs}ms${meta}`);
    }
  }
}
