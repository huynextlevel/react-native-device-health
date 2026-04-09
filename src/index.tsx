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

const NOT_SUPPORTED =
  "'@huynextlevel/react-native-device-health' is only supported on native platforms.";

export async function getCPUUsage(): Promise<CPUUsage> {
  throw new Error(NOT_SUPPORTED);
}

export function resetCPUSnapshot(): void {
  throw new Error(NOT_SUPPORTED);
}

export function getNetworkStats(): NetworkStats {
  throw new Error(NOT_SUPPORTED);
}

export async function runSpeedTest(_testUrl: string): Promise<SpeedTestResult> {
  throw new Error(NOT_SUPPORTED);
}

export async function getCPUInfo(): Promise<CPUInfo> {
  throw new Error(NOT_SUPPORTED);
}

export async function getGPUInfo(): Promise<GPUInfo> {
  throw new Error(NOT_SUPPORTED);
}

export async function getChipset(): Promise<string> {
  throw new Error(NOT_SUPPORTED);
}
