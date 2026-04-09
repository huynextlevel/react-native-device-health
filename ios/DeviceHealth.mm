#import "DeviceHealth.h"

// Swift bridging header — auto-generated when module contains Swift code
#if __has_include("DeviceHealth-Swift.h")
#import "DeviceHealth-Swift.h"
#else
#import <DeviceHealth/DeviceHealth-Swift.h>
#endif

@implementation DeviceHealth {
    DeviceHealthImpl *_impl;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _impl = [[DeviceHealthImpl alloc] init];
    }
    return self;
}

+ (NSString *)moduleName {
    return @"DeviceHealth";
}

// MARK: - TurboModule Methods

- (void)getCPUUsage:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    NSDictionary *result = [_impl getCPUUsage];
    resolve(result);
}

- (void)resetCPUSnapshot {
    [_impl resetCPUSnapshot];
}

- (NSDictionary *)getNetworkStats {
    return [_impl getNetworkStats];
}

- (void)runSpeedTest:(NSString *)testUrl
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    [_impl runSpeedTest:testUrl completion:^(NSDictionary *result) {
        resolve(result);
    }];
}

// MARK: - Hardware Info (Static)

- (void)getCPUInfo:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    NSDictionary *result = [_impl getCPUInfo];
    resolve(result);
}

- (void)getGPUInfo:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    NSDictionary *result = [_impl getGPUInfo];
    resolve(result);
}

- (void)getChipset:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    NSString *result = [_impl getChipset];
    resolve(result);
}

// MARK: - TurboModule JSI Registration

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeDeviceHealthSpecJSI>(params);
}

@end
