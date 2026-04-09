package com.devicehealth

import android.net.TrafficStats
import android.opengl.GLES20
import android.os.Build
import android.os.Process
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.regex.Pattern
import javax.microedition.khronos.egl.EGL10
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.egl.EGLContext
import javax.microedition.khronos.egl.EGLDisplay

class DeviceHealthModule(reactContext: ReactApplicationContext) :
  NativeDeviceHealthSpec(reactContext) {

  /**
   * Previous snapshot for delta calculation.
   * Uses Process.getElapsedCpuTime() (app-specific, no /proc/stat permission needed).
   */
  private var prevCpuTimeMs: Long = 0
  private var prevWallTimeMs: Long = 0
  private var hasPreviousSnapshot = false

  // ── CPU Usage ──────────────────────────────────────────────────

  override fun getCPUUsage(promise: Promise) {
    val cpuTimeMs = Process.getElapsedCpuTime()
    val wallTimeMs = SystemClock.elapsedRealtime()
    val coreCount = Runtime.getRuntime().availableProcessors()

    var usagePercent = -1.0

    if (hasPreviousSnapshot) {
      val cpuDelta = cpuTimeMs - prevCpuTimeMs
      val wallDelta = wallTimeMs - prevWallTimeMs

      if (wallDelta > 0 && coreCount > 0) {
        usagePercent = (cpuDelta.toDouble() / (wallDelta * coreCount)) * 100.0
        usagePercent = Math.round(usagePercent * 10.0) / 10.0
        usagePercent = usagePercent.coerceIn(0.0, 100.0)
      }
    }

    prevCpuTimeMs = cpuTimeMs
    prevWallTimeMs = wallTimeMs
    hasPreviousSnapshot = true

    val result = WritableNativeMap()
    result.putDouble("usagePercent", usagePercent)
    result.putInt("coreCount", coreCount)
    promise.resolve(result)
  }

  // ── CPU Reset ──────────────────────────────────────────────────

  override fun resetCPUSnapshot() {
    hasPreviousSnapshot = false
    prevCpuTimeMs = 0
    prevWallTimeMs = 0
  }

  // ── Network Stats ──────────────────────────────────────────────

  override fun getNetworkStats(): WritableMap {
    val uid = Process.myUid()
    val rxBytes = TrafficStats.getUidRxBytes(uid)
    val txBytes = TrafficStats.getUidTxBytes(uid)

    val result = WritableNativeMap()
    result.putDouble(
      "bytesReceived",
      if (rxBytes != TrafficStats.UNSUPPORTED.toLong()) rxBytes.toDouble() else -1.0
    )
    result.putDouble(
      "bytesSent",
      if (txBytes != TrafficStats.UNSUPPORTED.toLong()) txBytes.toDouble() else -1.0
    )
    return result
  }

  // ── Speed Test ──────────────────────────────────────────────────

  override fun runSpeedTest(testUrl: String, promise: Promise) {
    Thread {
      var connection: HttpURLConnection? = null

      try {
        val url = URL(testUrl)
        connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 15_000
        connection.readTimeout = 15_000
        connection.useCaches = false

        val startTime = SystemClock.elapsedRealtime()
        connection.connect()

        val inputStream = connection.inputStream
        val buffer = ByteArray(8192)
        var totalBytesRead = 0

        while (true) {
          val bytesRead = inputStream.read(buffer)
          if (bytesRead == -1) break
          totalBytesRead += bytesRead
        }

        inputStream.close()
        val endTime = SystemClock.elapsedRealtime()
        val durationMs = endTime - startTime

        var speedMbps = -1.0
        if (totalBytesRead > 0 && durationMs > 0) {
          speedMbps = (totalBytesRead.toDouble() * 8.0) / (durationMs * 1000.0)
          speedMbps = Math.round(speedMbps * 100.0) / 100.0
        }

        val result = WritableNativeMap()
        result.putDouble("downloadSpeedMbps", speedMbps)
        result.putInt("bytesDownloaded", totalBytesRead)
        result.putDouble("durationMs", durationMs.toDouble())
        promise.resolve(result)
      } catch (e: Exception) {
        val result = WritableNativeMap()
        result.putDouble("downloadSpeedMbps", -1.0)
        result.putInt("bytesDownloaded", 0)
        result.putDouble("durationMs", -1.0)
        promise.resolve(result)
      } finally {
        try { connection?.disconnect() } catch (_: Exception) {}
      }
    }.start()
  }

  // ── Hardware Info (Static) ───────────────────────────────────

  override fun getCPUInfo(promise: Promise) {
    try {
      val cpuInfo = Arguments.createMap()
      cpuInfo.putInt("cores", Runtime.getRuntime().availableProcessors())

      val processors = Arguments.createArray()
      val features = mutableSetOf<String>()
      val cpuInfoFile = File("/proc/cpuinfo")

      if (cpuInfoFile.exists()) {
        val cpuInfoLines = cpuInfoFile.readLines()
        var currentProcessor = Arguments.createMap()
        var hasData = false

        for (line in cpuInfoLines) {
          if (line.isEmpty() && hasData) {
            processors.pushMap(currentProcessor)
            currentProcessor = Arguments.createMap()
            hasData = false
            continue
          }

          val parts = line.split(":")
          if (parts.size >= 2) {
            val key = parts[0].trim()
            val value = parts[1].trim()
            when (key) {
              "processor", "model name", "cpu MHz", "vendor_id" -> {
                currentProcessor.putString(key, value)
                hasData = true
              }
              "flags", "Features" -> {
                features.addAll(value.split(" ").filter { it.isNotEmpty() })
              }
            }
          }
        }

        if (hasData) {
          processors.pushMap(currentProcessor)
        }

        cpuInfo.putArray("processors", processors)

        val featuresArray = Arguments.createArray()
        features.forEach { featuresArray.pushString(it) }
        cpuInfo.putArray("features", featuresArray)

        cpuInfo.putBoolean("hasFp16", features.any { it in setOf("fphp", "fp16") })
        cpuInfo.putBoolean("hasDotProd", features.any { it in setOf("dotprod", "asimddp") })
        cpuInfo.putBoolean("hasSve", features.any { it == "sve" })
        cpuInfo.putBoolean("hasI8mm", features.any { it == "i8mm" })
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        cpuInfo.putString("socModel", Build.SOC_MODEL)
      }

      promise.resolve(cpuInfo)
    } catch (e: Exception) {
      promise.reject("ERROR", e.message)
    }
  }

  override fun getGPUInfo(promise: Promise) {
    try {
      val gpuInfo = Arguments.createMap()
      var renderer = ""
      var vendor = ""
      var version = ""

      try {
        val egl = EGLContext.getEGL() as EGL10
        val display = egl.eglGetDisplay(EGL10.EGL_DEFAULT_DISPLAY)

        if (display != EGL10.EGL_NO_DISPLAY) {
          val versionArray = IntArray(2)
          egl.eglInitialize(display, versionArray)

          val configsCount = IntArray(1)
          val configs = arrayOfNulls<EGLConfig>(1)
          val configSpec = intArrayOf(
            EGL10.EGL_RENDERABLE_TYPE, 4,
            EGL10.EGL_NONE
          )

          egl.eglChooseConfig(display, configSpec, configs, 1, configsCount)

          if (configsCount[0] > 0) {
            val context = egl.eglCreateContext(
              display,
              configs[0],
              EGL10.EGL_NO_CONTEXT,
              intArrayOf(0x3098, 2, EGL10.EGL_NONE)
            )

            if (context != null && context != EGL10.EGL_NO_CONTEXT) {
              val surfaceAttribs = intArrayOf(
                EGL10.EGL_WIDTH, 1,
                EGL10.EGL_HEIGHT, 1,
                EGL10.EGL_NONE
              )
              val surface = egl.eglCreatePbufferSurface(display, configs[0], surfaceAttribs)

              if (surface != null && surface != EGL10.EGL_NO_SURFACE) {
                egl.eglMakeCurrent(display, surface, surface, context)

                renderer = GLES20.glGetString(GLES20.GL_RENDERER) ?: ""
                vendor = GLES20.glGetString(GLES20.GL_VENDOR) ?: ""
                version = GLES20.glGetString(GLES20.GL_VERSION) ?: ""

                egl.eglMakeCurrent(display, EGL10.EGL_NO_SURFACE, EGL10.EGL_NO_SURFACE, EGL10.EGL_NO_CONTEXT)
                egl.eglDestroySurface(display, surface)
              }
              egl.eglDestroyContext(display, context)
            }
          }
          egl.eglTerminate(display)
        }
      } catch (_: Exception) {
        // GPU info not available
      }

      gpuInfo.putString("renderer", renderer)
      gpuInfo.putString("vendor", vendor)
      gpuInfo.putString("version", version)

      val rendererLower = renderer.lowercase()
      val hasAdreno = Pattern.compile("(adreno|qcom|qualcomm)").matcher(rendererLower).find()
      val hasMali = Pattern.compile("mali").matcher(rendererLower).find()
      val hasPowerVR = Pattern.compile("powervr").matcher(rendererLower).find()

      gpuInfo.putBoolean("hasAdreno", hasAdreno)
      gpuInfo.putBoolean("hasMali", hasMali)
      gpuInfo.putBoolean("hasPowerVR", hasPowerVR)
      gpuInfo.putBoolean("supportsOpenCL", hasAdreno)

      val gpuType = when {
        hasAdreno -> "Adreno (Qualcomm)"
        hasMali -> "Mali (ARM)"
        hasPowerVR -> "PowerVR (Imagination)"
        renderer.isNotEmpty() -> renderer
        else -> "Unknown"
      }
      gpuInfo.putString("gpuType", gpuType)

      promise.resolve(gpuInfo)
    } catch (e: Exception) {
      promise.reject("ERROR", e.message)
    }
  }

  override fun getChipset(promise: Promise) {
    try {
      val chipset = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Build.SOC_MODEL.takeUnless { it.isNullOrEmpty() }
          ?: Build.HARDWARE.takeUnless { it.isNullOrEmpty() }
          ?: Build.BOARD
      } else {
        Build.HARDWARE.takeUnless { it.isNullOrEmpty() } ?: Build.BOARD
      }
      promise.resolve(chipset)
    } catch (e: Exception) {
      promise.reject("ERROR", e.message)
    }
  }

  companion object {
    const val NAME = NativeDeviceHealthSpec.NAME
  }
}
