# Changelog

All notable changes to **`@huynextlevel/react-native-device-health`** will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] — 2026-04-09

### Fixed

- **Module resolution on native platforms.** The `package.json` `exports` map did not declare a `react-native` condition, so consumer Metro instances could resolve the package to the web stub (`lib/module/index.js`) instead of the native bindings (`lib/module/index.native.js`). Calling any API would throw `'@huynextlevel/react-native-device-health' is only supported on native platforms.` even on iOS and Android.
  - Added `"react-native": "./lib/module/index.native.js"` to the `exports` map, ordered before `source` so it wins on Metro resolvers that recognize the `source` condition.
  - Added a top-level `"react-native"` field as a safety net for older Metro versions that do not process the `exports` map.

## [1.0.0] — 2026-04-09

Initial public release of `@huynextlevel/react-native-device-health` — a TurboModule for the React Native New Architecture that exposes native device health and hardware introspection APIs on iOS and Android.

### Added

#### Real-time monitoring

- **`getCPUUsage()`** — system-wide CPU usage as a percentage with active core count.
  - iOS: `host_statistics(HOST_CPU_LOAD_INFO)` via the Mach kernel.
  - Android: `Process.getElapsedCpuTime()` delta sampling.
  - First call returns `usagePercent: -1` as a priming read; recommended polling interval 3–5 seconds.
- **`resetCPUSnapshot()`** — clears the stored CPU tick snapshot so the next monitoring session starts from a clean baseline.
- **`getNetworkStats()`** — synchronous read of cumulative RX/TX byte counters since device boot.
  - iOS: `getifaddrs()` summed across all network interfaces (system-wide).
  - Android: `TrafficStats.getUidRxBytes()` / `getUidTxBytes()` (app-scoped).
- **`runSpeedTest(testUrl)`** — one-shot download speed test against a known asset URL, returning Mbps, bytes downloaded, and duration.
  - iOS: `URLSession` download task with caching disabled.
  - Android: `HttpURLConnection` full streaming download.

#### Hardware introspection

- **`getCPUInfo()`** — CPU core count plus per-processor details and ISA feature flags.
  - Android: parses `/proc/cpuinfo` and exposes `hasFp16`, `hasDotProd`, `hasSve`, `hasI8mm`, plus the raw `features[]` and `processors[]` arrays.
  - iOS: returns `cores` count via `NSProcessInfo`.
- **`getGPUInfo()`** — GPU renderer, vendor, API version, and family detection (`hasAdreno`, `hasMali`, `hasPowerVR`, `supportsOpenCL`, `gpuType`).
  - iOS: queries Metal via `MTLCreateSystemDefaultDevice`.
  - Android: creates an EGL context and reads `glGetString()`.
- **`getChipset()`** — SoC model name (Android only).
  - Android 12+ (API 31): `Build.SOC_MODEL` (e.g. `"SM8550"`).
  - Older Android: `Build.HARDWARE` / `Build.BOARD` fallback.
  - iOS: returns an empty string.

#### Type definitions

- TypeScript interfaces shipped from `./src/types`: `CPUUsage`, `NetworkStats`, `SpeedTestResult`, `CPUInfo`, `CPUProcessor`, `GPUInfo`.
- Codegen spec ([`src/NativeDeviceHealth.ts`](./src/NativeDeviceHealth.ts)) registered as the `DeviceHealth` TurboModule.

#### Tooling and packaging

- React Native New Architecture (TurboModule) implementation — no legacy bridge support.
- iOS native sources split between [`ios/DeviceHealth.mm`](./ios/DeviceHealth.mm) (Obj-C++ bridge) and [`ios/DeviceHealthImpl.swift`](./ios/DeviceHealthImpl.swift) (Swift implementation).
- Android implementation in [`android/src/main/java/com/devicehealth/DeviceHealthModule.kt`](./android/src/main/java/com/devicehealth/DeviceHealthModule.kt).
- Platform-split JS entry: `src/index.tsx` (web/SSR stub that throws) and `src/index.native.tsx` (native bindings).
- Example app under [`example/`](./example) demonstrating polling, speed test, and live UI bindings.
- Professional README with API reference, platform support matrix, requirements table, and Expo dev-client setup instructions.

### Requirements

- React Native `>= 0.83` with the **New Architecture enabled**.
- iOS `>= 13.4`.
- Android `minSdkVersion >= 24`.
- Expo SDK 52+ (custom development client only — not Expo Go).

### Permissions

- Android: declares `android.permission.INTERNET` automatically (required by `runSpeedTest`).

### Known limitations

- **`getNetworkStats` scope differs by platform.** iOS counters are system-wide (sum of all interfaces), while Android counters are app-scoped (`TrafficStats` per UID). Surface this in your UI if it matters.
- **`getCPUInfo` is asymmetric.** ISA feature detection (`hasFp16`, `hasDotProd`, `hasSve`, `hasI8mm`), `processors[]`, and `socModel` are Android-only — iOS returns `cores` only.
- **`getChipset` is Android-only.** On iOS it returns an empty string; query Apple Silicon details via `utsname` if needed.
- **TurboModule only.** This package does not support the legacy bridge — `TurboModuleRegistry.getEnforcing` will throw if the New Architecture is disabled.

[Unreleased]: https://github.com/huynextlevel/react-native-device-health/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/huynextlevel/react-native-device-health/compare/v1.0.0...v1.0.2
[1.0.0]: https://github.com/huynextlevel/react-native-device-health/releases/tag/v1.0.0
