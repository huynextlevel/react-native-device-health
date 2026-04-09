import Foundation
import Darwin
import MachO
import Metal

@objc public class DeviceHealthImpl: NSObject {

  // MARK: - CPU Tracking State

  private var prevUserTicks: UInt32 = 0
  private var prevSystemTicks: UInt32 = 0
  private var prevIdleTicks: UInt32 = 0
  private var prevNiceTicks: UInt32 = 0
  private var hasPreviousSnapshot = false

  // MARK: - CPU Usage

  @objc public func getCPUUsage() -> [String: Any] {
    let HOST_CPU_LOAD_INFO_COUNT =
      MemoryLayout<host_cpu_load_info>.stride / MemoryLayout<integer_t>.stride

    var size = mach_msg_type_number_t(HOST_CPU_LOAD_INFO_COUNT)
    var cpuLoadInfo = host_cpu_load_info()

    let result = withUnsafeMutablePointer(to: &cpuLoadInfo) {
      $0.withMemoryRebound(to: integer_t.self, capacity: HOST_CPU_LOAD_INFO_COUNT) {
        host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0, &size)
      }
    }

    guard result == KERN_SUCCESS else {
      return [
        "usagePercent": -1.0,
        "coreCount": ProcessInfo.processInfo.activeProcessorCount,
      ]
    }

    let user = cpuLoadInfo.cpu_ticks.0
    let system = cpuLoadInfo.cpu_ticks.1
    let idle = cpuLoadInfo.cpu_ticks.2
    let nice = cpuLoadInfo.cpu_ticks.3

    var usagePercent: Double = -1

    if hasPreviousSnapshot {
      let userDelta = Double(user &- prevUserTicks)
      let systemDelta = Double(system &- prevSystemTicks)
      let idleDelta = Double(idle &- prevIdleTicks)
      let niceDelta = Double(nice &- prevNiceTicks)

      let totalDelta = userDelta + systemDelta + idleDelta + niceDelta
      if totalDelta > 0 {
        usagePercent = ((userDelta + systemDelta + niceDelta) / totalDelta) * 100.0
      }
    }

    prevUserTicks = user
    prevSystemTicks = system
    prevIdleTicks = idle
    prevNiceTicks = nice
    hasPreviousSnapshot = true

    return [
      "usagePercent": round(usagePercent * 10) / 10,
      "coreCount": ProcessInfo.processInfo.activeProcessorCount,
    ]
  }

  // MARK: - CPU Reset

  @objc public func resetCPUSnapshot() {
    hasPreviousSnapshot = false
    prevUserTicks = 0
    prevSystemTicks = 0
    prevIdleTicks = 0
    prevNiceTicks = 0
  }

  // MARK: - Network Stats

  @objc public func getNetworkStats() -> [String: Any] {
    var bytesReceived: UInt64 = 0
    var bytesSent: UInt64 = 0

    var ifaddr: UnsafeMutablePointer<ifaddrs>?
    guard getifaddrs(&ifaddr) == 0, let firstAddr = ifaddr else {
      return ["bytesReceived": -1, "bytesSent": -1] as [String: Any]
    }

    defer { freeifaddrs(ifaddr) }

    var cursor = firstAddr
    while true {
      let addr = cursor.pointee

      // Only count AF_LINK (data link layer) interfaces
      if addr.ifa_addr?.pointee.sa_family == UInt8(AF_LINK) {
        if let data = addr.ifa_data {
          let networkData = data.assumingMemoryBound(to: if_data.self).pointee
          bytesReceived += UInt64(networkData.ifi_ibytes)
          bytesSent += UInt64(networkData.ifi_obytes)
        }
      }

      guard let next = addr.ifa_next else { break }
      cursor = next
    }

    return [
      "bytesReceived": bytesReceived,
      "bytesSent": bytesSent,
    ] as [String: Any]
  }

  // MARK: - Speed Test

  @objc public func runSpeedTest(
    _ testUrl: String,
    completion: @escaping ([String: Any]) -> Void
  ) {
    let failureResult: [String: Any] = [
      "downloadSpeedMbps": -1.0,
      "bytesDownloaded": 0,
      "durationMs": -1.0,
    ]

    guard let url = URL(string: testUrl) else {
      completion(failureResult)
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.timeoutInterval = 15.0
    request.cachePolicy = .reloadIgnoringLocalCacheData

    let startTime = CFAbsoluteTimeGetCurrent()

    URLSession.shared.dataTask(with: request) { data, _, error in
      if error != nil {
        completion(failureResult)
        return
      }

      let endTime = CFAbsoluteTimeGetCurrent()
      let durationMs = (endTime - startTime) * 1000.0
      let bytesDownloaded = data?.count ?? 0

      var speedMbps = -1.0
      if bytesDownloaded > 0 && durationMs > 0 {
        speedMbps = (Double(bytesDownloaded) * 8.0) / (durationMs * 1000.0)
        speedMbps = round(speedMbps * 100) / 100
      }

      completion([
        "downloadSpeedMbps": speedMbps,
        "bytesDownloaded": bytesDownloaded,
        "durationMs": round(durationMs * 10) / 10,
      ])
    }.resume()
  }

  // MARK: - Hardware Info (Static)

  @objc public func getCPUInfo() -> [String: Any] {
    return [
      "cores": ProcessInfo.processInfo.activeProcessorCount,
    ]
  }

  @objc public func getGPUInfo() -> [String: Any] {
    let device = MTLCreateSystemDefaultDevice()
    let gpuName = device?.name ?? "Unknown"

    return [
      "renderer": gpuName,
      "vendor": "Apple",
      "version": "Metal",
      "hasAdreno": false,
      "hasMali": false,
      "hasPowerVR": false,
      "supportsOpenCL": false,
      "gpuType": "Apple GPU (Metal)",
    ]
  }

  @objc public func getChipset() -> String {
    return "" // iOS: use getCPUInfo/getGPUInfo for Apple Silicon info
  }
}
