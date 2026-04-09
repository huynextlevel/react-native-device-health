import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Real-time monitoring
  getCPUUsage(): Promise<Object>;
  resetCPUSnapshot(): void;
  getNetworkStats(): Object;
  runSpeedTest(testUrl: string): Promise<Object>;

  // Hardware info (static)
  getCPUInfo(): Promise<Object>;
  getGPUInfo(): Promise<Object>;
  getChipset(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceHealth');
