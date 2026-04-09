# @huynextlevel/react-native-device-health

[![npm version](https://img.shields.io/npm/v/@huynextlevel/react-native-device-health.svg)](https://www.npmjs.com/package/@huynextlevel/react-native-device-health)
[![license](https://img.shields.io/npm/l/@huynextlevel/react-native-device-health.svg)](./LICENSE)
[![platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android-blue.svg)](#platform-support)

Native device health monitoring for React Native and Expo: real-time CPU usage, network throughput, download speed test, and detailed CPU/GPU/SoC hardware information — powered by the New Architecture (TurboModules).

## Features

- **Real-time CPU usage** — system-wide CPU percentage from Mach kernel (iOS) and `Process.getElapsedCpuTime()` (Android)
- **Network throughput** — cumulative RX/TX byte counters for calculating live bandwidth
- **Download speed test** — measure connection speed against a known asset URL
- **Hardware introspection** — CPU cores, ISA features (FP16, dot product, SVE, I8MM), GPU renderer/vendor, and SoC model
- **TurboModule (New Architecture)** — type-safe codegen, synchronous reads where possible
- **Zero JS bridge dependencies** — pure native implementations (Swift / Kotlin)

## Requirements

| Requirement      | Version                          |
| ---------------- | -------------------------------- |
| React Native     | `>= 0.83` (New Architecture)     |
| iOS              | `>= 13.4`                        |
| Android          | `minSdkVersion >= 24`            |
| Expo             | SDK 52+ (custom dev client only) |

> This package is a **TurboModule** and requires the New Architecture to be enabled. It is **not** compatible with the legacy bridge.

## Installation

```sh
npm install @huynextlevel/react-native-device-health
# or
yarn add @huynextlevel/react-native-device-health
# or
pnpm add @huynextlevel/react-native-device-health
```

### iOS

Install pods after adding the package:

```sh
cd ios && pod install
```

No additional configuration is required.

### Android

The library declares the `INTERNET` permission automatically (required by `runSpeedTest`). No manual `AndroidManifest.xml` changes are needed for autolinked projects.

### Expo

This module contains native code, so it cannot run in Expo Go. Use a [custom development client](https://docs.expo.dev/develop/development-builds/introduction/):

```sh
npx expo install @huynextlevel/react-native-device-health
npx expo prebuild
npx expo run:ios   # or run:android
```

## Quick Start

```tsx
import {
  getCPUUsage,
  getNetworkStats,
  runSpeedTest,
  getCPUInfo,
  getGPUInfo,
  getChipset,
} from '@huynextlevel/react-native-device-health';

// Real-time CPU (poll every 3-5s)
const cpu = await getCPUUsage();
console.log(`CPU: ${cpu.usagePercent}% across ${cpu.coreCount} cores`);

// Network throughput (delta between two samples = bandwidth)
const net = getNetworkStats();
console.log(`RX: ${net.bytesReceived} bytes, TX: ${net.bytesSent} bytes`);

// Speed test
const result = await runSpeedTest('https://your-cdn.com/test-file.bin');
console.log(`Download: ${result.downloadSpeedMbps} Mbps`);

// Static hardware info
const [cpuInfo, gpuInfo, chipset] = await Promise.all([
  getCPUInfo(),
  getGPUInfo(),
  getChipset(),
]);
```

## API Reference

### Real-time monitoring

#### `getCPUUsage(): Promise<CPUUsage>`

Returns system-wide CPU usage as a percentage. Internally uses delta sampling between consecutive calls — **the first call returns `usagePercent: -1`** (priming read). Recommended polling interval: **3–5 seconds**.

```ts
const { usagePercent, coreCount } = await getCPUUsage();
```

| Platform | Implementation                            |
| -------- | ----------------------------------------- |
| iOS      | `host_statistics(HOST_CPU_LOAD_INFO)`     |
| Android  | `Process.getElapsedCpuTime()` delta       |

---

#### `resetCPUSnapshot(): void`

Clears the stored CPU tick snapshot. Call this when starting a new monitoring session so the next `getCPUUsage()` call starts from a clean baseline.

```ts
resetCPUSnapshot();
const cpu = await getCPUUsage(); // Will return -1 (priming read)
```

---

#### `getNetworkStats(): NetworkStats`

Synchronously reads cumulative network byte counters from the OS. Returns bytes received/sent **since device boot** — calculate the delta between two reads to derive throughput.

```ts
const t1 = getNetworkStats();
await sleep(5000);
const t2 = getNetworkStats();

const downloadKbps = ((t2.bytesReceived - t1.bytesReceived) * 8) / 1000 / 5;
```

| Platform | Implementation                                                           |
| -------- | ------------------------------------------------------------------------ |
| iOS      | `getifaddrs()` — sums all network interface counters (system-wide)       |
| Android  | `TrafficStats.getUidRxBytes()` / `getUidTxBytes()` — current app only    |

> **Note:** iOS counters are system-wide while Android counters are app-scoped due to platform restrictions. Plan your UI accordingly.

---

#### `runSpeedTest(testUrl: string): Promise<SpeedTestResult>`

Downloads the entire file at `testUrl` and measures throughput. Use a CDN-hosted asset of known size (1–10 MB recommended) for accurate results.

```ts
const result = await runSpeedTest('https://your-cdn.com/10mb.bin');
// { downloadSpeedMbps: 87.4, bytesDownloaded: 10485760, durationMs: 960 }
```

To avoid HTTP caching, append a cache-busting query param:

```ts
runSpeedTest(`https://your-cdn.com/10mb.bin?_cb=${Date.now()}`);
```

| Platform | Implementation                                  |
| -------- | ----------------------------------------------- |
| iOS      | `URLSession` download task (no cache)           |
| Android  | `HttpURLConnection` full streaming download     |

### Hardware information (static)

#### `getCPUInfo(): Promise<CPUInfo>`

Returns CPU core count and, on Android, detailed processor information parsed from `/proc/cpuinfo` including ISA feature flags (useful for ML workloads).

```ts
const info = await getCPUInfo();
// {
//   cores: 8,
//   hasFp16: true,
//   hasDotProd: true,
//   hasSve: false,
//   hasI8mm: true,
//   features: ['fp16', 'dotprod', 'i8mm', ...],
//   processors: [{ processor: '0', 'model name': '...' }, ...],
//   socModel: 'SM8550'
// }
```

> On iOS, only `cores` is populated. Use `getChipset()` is unavailable on iOS — query Apple Silicon details via [`utsname`](https://developer.apple.com/documentation/posix/utsname) if needed.

---

#### `getGPUInfo(): Promise<GPUInfo>`

Returns GPU renderer, vendor, API version, and family detection (Adreno, Mali, PowerVR, Apple).

```ts
const gpu = await getGPUInfo();
// {
//   renderer: 'Adreno (TM) 740',
//   vendor: 'Qualcomm',
//   version: 'OpenGL ES 3.2',
//   hasAdreno: true,
//   hasMali: false,
//   hasPowerVR: false,
//   supportsOpenCL: true,
//   gpuType: 'Adreno'
// }
```

| Platform | Implementation                                              |
| -------- | ----------------------------------------------------------- |
| iOS      | Metal API (`MTLCreateSystemDefaultDevice`)                  |
| Android  | EGL context + OpenGL ES `glGetString()` queries             |

---

#### `getChipset(): Promise<string>`

Returns the SoC model name. **Android only** — returns an empty string on iOS.

```ts
const soc = await getChipset(); // 'SM8550' on Android, '' on iOS
```

| Android version | Source                       |
| --------------- | ---------------------------- |
| 12+ (API 31)    | `Build.SOC_MODEL`            |
| Older           | `Build.HARDWARE` / `Build.BOARD` |

## Type Definitions

```ts
interface CPUUsage {
  /** CPU usage percentage (0–100). Returns -1 on first call (no previous snapshot). */
  usagePercent: number;
  /** Number of active CPU cores. */
  coreCount: number;
}

interface NetworkStats {
  /** Cumulative bytes received since device boot. -1 if unsupported. */
  bytesReceived: number;
  /** Cumulative bytes sent since device boot. -1 if unsupported. */
  bytesSent: number;
}

interface SpeedTestResult {
  /** Measured download speed in Mbps. -1 if failed. */
  downloadSpeedMbps: number;
  /** Bytes downloaded during the test. */
  bytesDownloaded: number;
  /** Total test duration in ms. -1 if failed. */
  durationMs: number;
}

interface CPUInfo {
  cores: number;
  processors?: CPUProcessor[];
  features?: string[];
  hasFp16?: boolean;
  hasDotProd?: boolean;
  hasSve?: boolean;
  hasI8mm?: boolean;
  socModel?: string;
}

interface GPUInfo {
  renderer: string;
  vendor: string;
  version: string;
  hasAdreno: boolean;
  hasMali: boolean;
  hasPowerVR: boolean;
  supportsOpenCL: boolean;
  gpuType: string;
}
```

## Platform Support

| Feature             | iOS                       | Android                       |
| ------------------- | ------------------------- | ----------------------------- |
| `getCPUUsage`       | System-wide               | App-scoped                    |
| `resetCPUSnapshot`  | Yes                       | Yes                           |
| `getNetworkStats`   | System-wide (all ifaces)  | App-scoped (`TrafficStats`)   |
| `runSpeedTest`      | Yes                       | Yes                           |
| `getCPUInfo`        | Cores only                | Full (cores, features, SoC)   |
| `getGPUInfo`        | Metal                     | OpenGL ES + family detection  |
| `getChipset`        | Not supported             | Yes                           |

## Example App

A complete polling and speed-test demo lives in [`example/`](./example):

```sh
git clone https://github.com/huynextlevel/react-native-device-health.git
cd react-native-device-health
yarn
yarn example ios   # or: yarn example android
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to this repository and the development workflow.

## License

[MIT](./LICENSE) © huynextlevel
