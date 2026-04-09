import DeviceHealth from './NativeDeviceHealth';
import type {
  CPUUsage,
  NetworkStats,
  SpeedTestResult,
  CPUInfo,
  GPUInfo,
} from './types';

export type {
  CPUUsage,
  NetworkStats,
  SpeedTestResult,
  CPUInfo,
  CPUProcessor,
  GPUInfo,
} from './types';

/**
 * Get current system-wide CPU usage as a percentage.
 *
 * Uses delta between consecutive calls — first call returns -1 (priming read).
 * Recommended polling interval: 3-5 seconds.
 *
 * iOS: Mach kernel host_statistics (HOST_CPU_LOAD_INFO)
 * Android: Process.getElapsedCpuTime() delta
 */
export async function getCPUUsage(): Promise<CPUUsage> {
  return DeviceHealth.getCPUUsage() as Promise<CPUUsage>;
}

/**
 * Reset the stored CPU tick snapshot.
 * Call when a monitoring session ends so the next session starts fresh.
 */
export function resetCPUSnapshot(): void {
  DeviceHealth.resetCPUSnapshot();
}

/**
 * Read cumulative network byte counters from OS.
 * Returns bytes received/sent since device boot — caller calculates delta for throughput.
 *
 * iOS: getifaddrs() — sums all network interface byte counters
 * Android: TrafficStats.getUidRxBytes/getUidTxBytes — app-specific counters
 *
 * Synchronous native call (no network I/O), safe to poll every 5s.
 */
export function getNetworkStats(): NetworkStats {
  return DeviceHealth.getNetworkStats() as NetworkStats;
}

/**
 * Run a one-time speed test by downloading a file from a URL.
 * Downloads the entire file for accurate throughput measurement.
 *
 * iOS: URLSession download (no caching)
 * Android: HttpURLConnection full download
 *
 * @param testUrl - URL to a known-size file (e.g. CDN asset)
 */
export async function runSpeedTest(testUrl: string): Promise<SpeedTestResult> {
  return DeviceHealth.runSpeedTest(testUrl) as Promise<SpeedTestResult>;
}

// ── Hardware Info (static, one-time queries) ─────────────────

/**
 * Get static CPU information: core count, processor details, instruction set features.
 *
 * iOS: Returns core count only (via NSProcessInfo).
 * Android: Reads /proc/cpuinfo for full details including features (fp16, dotprod, sve, i8mm).
 */
export async function getCPUInfo(): Promise<CPUInfo> {
  return DeviceHealth.getCPUInfo() as Promise<CPUInfo>;
}

/**
 * Get GPU information: renderer name, vendor, API version, and GPU family detection.
 *
 * iOS: Uses Metal API (MTLCreateSystemDefaultDevice).
 * Android: Creates EGL context and queries OpenGL ES strings + detects Adreno/Mali/PowerVR.
 */
export async function getGPUInfo(): Promise<GPUInfo> {
  return DeviceHealth.getGPUInfo() as Promise<GPUInfo>;
}

/**
 * Get chipset/SoC model name (Android only).
 *
 * Android 12+: Build.SOC_MODEL (e.g. "SM8550")
 * Older Android: Build.HARDWARE or Build.BOARD
 * iOS: Returns empty string (use getCPUInfo for Apple Silicon info).
 */
export async function getChipset(): Promise<string> {
  return DeviceHealth.getChipset() as Promise<string>;
}
