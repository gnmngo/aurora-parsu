import { createClient as createBrowserClient } from "@/lib/supabase/client";

/**
 * Record a telemetry probe into the system_telemetry_logs table.
 * Guaranteed to be non-blocking and fail-safe (never throws).
 */
export async function recordTelemetryLog(entry: {
  transaction_type: string;
  duration_ms: number;
  status?: "success" | "error";
  payload_size_bytes?: number;
  route?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("system_telemetry_logs").insert({
      transaction_type: entry.transaction_type,
      duration_ms: Number(entry.duration_ms.toFixed(2)),
      status: entry.status || "success",
      payload_size_bytes: entry.payload_size_bytes || null,
      route: entry.route || (typeof window !== "undefined" ? window.location.pathname : null),
      user_id: user?.id || null,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    // Fail-safe: telemetry logging should never interrupt operational user flow
    console.warn("[Telemetry] Probe recording skipped:", err);
  }
}

/**
 * Measures the execution time of an asynchronous function, records telemetry, and returns the result.
 */
export async function measureTransaction<T>(
  transactionType: string,
  action: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  let status: "success" | "error" = "success";
  try {
    const result = await action();
    return result;
  } catch (error) {
    status = "error";
    throw error;
  } finally {
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
    const duration = end - start;
    recordTelemetryLog({
      transaction_type: transactionType,
      duration_ms: duration,
      status,
      metadata,
    }).catch(() => {});
  }
}

/**
 * Benchmark runner for Cryptographic SHA-256 Manuscript Hashing (RO2 Benchmark)
 * Tests client-side WebCrypto throughput across typical PDF file sizes.
 */
export async function benchmarkSha256Hashing(
  sampleSizesMb: number[] = [0.5, 2.0, 5.0, 10.0]
): Promise<Array<{ fileSizeMb: number; durationMs: number; throughputMbps: number }>> {
  const results: Array<{ fileSizeMb: number; durationMs: number; throughputMbps: number }> = [];

  for (const sizeMb of sampleSizesMb) {
    const byteLength = Math.floor(sizeMb * 1024 * 1024);
    // Create random test payload
    const dummyBuffer = new Uint8Array(byteLength);
    // Partially populate to prevent zero-compression optimizations
    for (let i = 0; i < Math.min(byteLength, 10000); i += 16) {
      dummyBuffer[i] = (i * 37) % 256;
    }

    const t0 = performance.now();
    if (typeof crypto !== "undefined" && crypto.subtle) {
      await crypto.subtle.digest("SHA-256", dummyBuffer);
    }
    const t1 = performance.now();
    const duration = Math.max(t1 - t0, 0.1);
    const throughput = Number(((sizeMb * 8) / (duration / 1000)).toFixed(2));

    const item = {
      fileSizeMb: sizeMb,
      durationMs: Number(duration.toFixed(2)),
      throughputMbps: throughput,
    };

    results.push(item);

    // Record probe to DB
    await recordTelemetryLog({
      transaction_type: "pdf_sha256_hashing",
      duration_ms: duration,
      payload_size_bytes: byteLength,
      metadata: { benchmark: true, fileSizeMb: sizeMb, throughputMbps: throughput },
    });
  }

  return results;
}

/**
 * Benchmark runner for Weighted Rubric Score Calculations (RO2 Benchmark)
 */
export async function benchmarkRubricCalculations(iterations = 1000): Promise<{
  iterations: number;
  totalDurationMs: number;
  avgPerCalculationMs: number;
}> {
  const criteria = [
    { id: "c1", weight: 20 },
    { id: "c2", weight: 30 },
    { id: "c3", weight: 25 },
    { id: "c4", weight: 15 },
    { id: "c5", weight: 10 },
  ];

  const scores = { c1: 92, c2: 88, c3: 95, c4: 84, c5: 90 };

  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    // Weighted average algorithm
    let total = 0;
    for (let j = 0; j < criteria.length; j++) {
      total += (scores[criteria[j].id as keyof typeof scores] * criteria[j].weight) / 100;
    }
    // Prevent compiler dead-code elimination
    if (total < 0) console.log(total);
  }
  const t1 = performance.now();
  const totalDuration = t1 - t0;
  const avgPerCalc = totalDuration / iterations;

  await recordTelemetryLog({
    transaction_type: "rubric_weighted_calculation",
    duration_ms: avgPerCalc,
    metadata: { benchmark: true, iterations, totalDurationMs: totalDuration },
  });

  return {
    iterations,
    totalDurationMs: Number(totalDuration.toFixed(2)),
    avgPerCalculationMs: Number(avgPerCalc.toFixed(4)),
  };
}
