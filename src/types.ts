export interface CPUUsage {
  /** CPU usage percentage (0-100). Returns -1 on first call (no previous snapshot). */
  usagePercent: number;
  /** Number of active CPU cores. */
  coreCount: number;
}

export interface NetworkStats {
  /** Cumulative bytes received since device boot. -1 if unsupported. */
  bytesReceived: number;
  /** Cumulative bytes sent since device boot. -1 if unsupported. */
  bytesSent: number;
}

export interface SpeedTestResult {
  /** Measured download speed in Mbps. -1 if failed. */
  downloadSpeedMbps: number;
  /** Bytes downloaded during the test. */
  bytesDownloaded: number;
  /** Total test duration in ms. -1 if failed. */
  durationMs: number;
}

// ── Hardware Info (static, one-time queries) ─────────────────

export interface CPUProcessor {
  'processor'?: string;
  'model name'?: string;
  'cpu MHz'?: string;
  'vendor_id'?: string;
}

export interface CPUInfo {
  /** Number of CPU cores. */
  cores: number;
  /** Per-core processor details (Android only, from /proc/cpuinfo). */
  processors?: CPUProcessor[];
  /** CPU instruction set features, e.g. ["fp16","dotprod","sve"] (Android only). */
  features?: string[];
  /** Has FP16 (half-precision) support. */
  hasFp16?: boolean;
  /** Has dot product instruction support. */
  hasDotProd?: boolean;
  /** Has SVE (Scalable Vector Extension) support. */
  hasSve?: boolean;
  /** Has I8MM (Int8 matrix multiply) support. */
  hasI8mm?: boolean;
  /** SoC model name, e.g. "SM8550" (Android 12+ only). */
  socModel?: string;
}

export interface GPUInfo {
  /** GPU renderer string, e.g. "Adreno (TM) 740" or "Apple M2 GPU". */
  renderer: string;
  /** GPU vendor, e.g. "Qualcomm" or "Apple". */
  vendor: string;
  /** Graphics API version string. */
  version: string;
  /** True if Adreno (Qualcomm) GPU detected. */
  hasAdreno: boolean;
  /** True if Mali (ARM) GPU detected. */
  hasMali: boolean;
  /** True if PowerVR (Imagination) GPU detected. */
  hasPowerVR: boolean;
  /** True if OpenCL is likely supported (Adreno + CPU features). */
  supportsOpenCL: boolean;
  /** Human-readable GPU type string. */
  gpuType: string;
}
