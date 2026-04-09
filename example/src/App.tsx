import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  getCPUUsage,
  resetCPUSnapshot,
  getNetworkStats,
  runSpeedTest,
  type CPUUsage,
  type NetworkStats,
  type SpeedTestResult,
} from '@huynextlevel/react-native-device-health';

const SPEED_TEST_URL =
  'https://d1bcceam8ucosn.cloudfront.net/era-thumbnails/prophets-era';

export default function App() {
  const [cpu, setCpu] = useState<CPUUsage | null>(null);
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll CPU + network every 3s
  const startPolling = useCallback(() => {
    setIsPolling(true);
    resetCPUSnapshot(); // Fresh start

    intervalRef.current = setInterval(async () => {
      try {
        const cpuData = await getCPUUsage();
        setCpu(cpuData);

        const netData = getNetworkStats();
        setNetwork(netData);
      } catch (e) {
        console.warn('Poll error:', e);
      }
    }, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Run speed test
  const handleSpeedTest = useCallback(async () => {
    setIsTesting(true);
    setSpeedResult(null);
    try {
      const result = await runSpeedTest(`${SPEED_TEST_URL}?_cb=${Date.now()}`);
      setSpeedResult(result);
    } catch (e) {
      console.warn('Speed test error:', e);
    } finally {
      setIsTesting(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Device Health Monitor</Text>

        {/* CPU Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CPU Usage</Text>
          {cpu ? (
            <>
              <Text style={styles.value}>
                {cpu.usagePercent < 0 ? 'Priming...' : `${cpu.usagePercent}%`}
              </Text>
              <Text style={styles.label}>Cores: {cpu.coreCount}</Text>
            </>
          ) : (
            <Text style={styles.label}>Not polling</Text>
          )}
        </View>

        {/* Network Stats Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Network Stats (cumulative)</Text>
          {network ? (
            <>
              <Text style={styles.label}>
                RX: {(network.bytesReceived / 1024 / 1024).toFixed(1)} MB
              </Text>
              <Text style={styles.label}>
                TX: {(network.bytesSent / 1024 / 1024).toFixed(1)} MB
              </Text>
            </>
          ) : (
            <Text style={styles.label}>Not polling</Text>
          )}
        </View>

        {/* Speed Test Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Speed Test</Text>
          {speedResult ? (
            <>
              <Text style={styles.value}>
                {speedResult.downloadSpeedMbps > 0
                  ? `${speedResult.downloadSpeedMbps} Mbps`
                  : 'Failed'}
              </Text>
              <Text style={styles.label}>
                {(speedResult.bytesDownloaded / 1024 / 1024).toFixed(2)} MB in{' '}
                {speedResult.durationMs.toFixed(0)}ms
              </Text>
            </>
          ) : isTesting ? (
            <Text style={styles.label}>Running...</Text>
          ) : (
            <Text style={styles.label}>Tap button to test</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.button, isPolling && styles.buttonActive]}
            onPress={isPolling ? stopPolling : startPolling}
          >
            <Text style={styles.buttonText}>
              {isPolling ? 'Stop Polling' : 'Start Polling'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isTesting && styles.buttonDisabled]}
            onPress={handleSpeedTest}
            disabled={isTesting}
          >
            <Text style={styles.buttonText}>Run Speed Test</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 20,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
