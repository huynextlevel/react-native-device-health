package com.devicehealth

import com.facebook.react.bridge.ReactApplicationContext

class DeviceHealthModule(reactContext: ReactApplicationContext) :
  NativeDeviceHealthSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeDeviceHealthSpec.NAME
  }
}
