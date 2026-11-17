import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bluetooth,
  Radio,
  Search,
  Square,
  Wifi,
} from 'lucide-react';
import {
  BluetoothDeviceRecord,
  LogCategory,
  LogLevel,
  NeonPreset,
  WifiNetworkRecord,
} from '../types/flipper';
import { cyberAudio } from '../utils/audioFeedback';

type ScanMode = 'bluetooth' | 'wifi';

interface WirelessScannerProps {
  preset: NeonPreset;
  onLog?: (
    category: LogCategory,
    level: LogLevel,
    message: string,
    detail?: string
  ) => void;
}

const DISCOVERABLE_BLE_DEVICES: BluetoothDeviceRecord[] = [
  {
    id: 'ble-1',
    name: 'Flipper Zero · Cyber042',
    address: '80:E1:26:4B:19:A2',
    rssi: -38,
    protocol: 'BLE 5.2',
    category: 'hardware',
    angleDeg: 38,
    services: ['Serial RPC', 'Battery Service', 'Device Info'],
  },
  {
    id: 'ble-2',
    name: 'ESP32 Marauder Devboard',
    address: '7C:9E:BD:31:04:F8',
    rssi: -52,
    protocol: 'BLE 5.0',
    category: 'hardware',
    angleDeg: 132,
    services: ['UART Bridge', 'OTA Control'],
  },
  {
    id: 'ble-3',
    name: 'CyberLink Audio Buds',
    address: 'AC:BF:71:99:2E:10',
    rssi: -61,
    protocol: 'LE Audio',
    category: 'audio',
    angleDeg: 215,
    services: ['A2DP Sink', 'AVRCP', 'Battery Service'],
  },
  {
    id: 'ble-4',
    name: 'KeyChron K3 Pro',
    address: 'D4:3A:2C:88:14:7B',
    rssi: -67,
    protocol: 'BLE HID',
    category: 'hardware',
    angleDeg: 288,
    services: ['HID over GATT', 'Battery Service'],
  },
  {
    id: 'ble-5',
    name: 'Apex Pulse Band',
    address: 'F1:12:89:04:C3:55',
    rssi: -74,
    protocol: 'BLE 5.1',
    category: 'wearable',
    angleDeg: 326,
    services: ['Heart Rate', 'Step Telemetry'],
  },
];

const DISCOVERABLE_WIFI_NETWORKS: WifiNetworkRecord[] = [
  {
    id: 'wifi-1',
    ssid: 'CYBERLAB_CORE_5G',
    bssid: '04:D9:F5:82:11:C0',
    rssi: -41,
    channel: 36,
    band: '5 GHz',
    security: 'WPA3',
    angleDeg: 52,
    vendor: 'Ubiquiti Networks',
  },
  {
    id: 'wifi-2',
    ssid: 'Flipper_AP_Bridge',
    bssid: '24:6F:28:A9:70:14',
    rssi: -49,
    channel: 6,
    band: '2.4 GHz',
    security: 'WPA2',
    angleDeg: 145,
    vendor: 'Espressif Systems',
  },
  {
    id: 'wifi-3',
    ssid: 'Studio_Mesh_Backhaul',
    bssid: '9C:53:22:4E:81:09',
    rssi: -58,
    channel: 149,
    band: '5 GHz',
    security: 'WPA3',
    angleDeg: 224,
    vendor: 'AsusTek',
  },
  {
    id: 'wifi-4',
    ssid: 'IoT_Sensor_VLAN',
    bssid: 'B8:27:EB:63:42:AA',
    rssi: -68,
    channel: 11,
    band: '2.4 GHz',
    security: 'WPA2',
    angleDeg: 304,
    vendor: 'Raspberry Pi Trading',
  },
  {
    id: 'wifi-5',
    ssid: 'Guest_Beacon_Open',
    bssid: '68:FF:7B:19:5D:33',
    rssi: -79,
    channel: 1,
    band: '2.4 GHz',
    security: 'Open',
    angleDeg: 18,
    vendor: 'TP-Link',
  },
];

function SignalBars({ rssi, color }: { rssi: number; color: string }) {
  const level = rssi > -50 ? 4 : rssi > -62 ? 3 : rssi > -74 ? 2 : 1;
  return (
    <span
      className="inline-flex items-end gap-0.5"
      aria-label={`Signal strength ${rssi} dBm`}
    >
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="w-1 rounded-xs transition-colors"
          style={{
            height: `${bar * 3 + 3}px`,
            backgroundColor: bar <= level ? color : 'rgba(148, 163, 184, 0.22)',
          }}
        />
      ))}
    </span>
  );
}

export function WirelessScanner({ preset, onLog }: WirelessScannerProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('bluetooth');
  const [isScanning, setIsScanning] = useState(false);
  const [scanPercent, setScanPercent] = useState(100);
  const [bleDevices, setBleDevices] = useState<BluetoothDeviceRecord[]>(
    DISCOVERABLE_BLE_DEVICES.slice(0, 3)
  );
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetworkRecord[]>(
    DISCOVERABLE_WIFI_NETWORKS.slice(0, 3)
  );
  const [selectedId, setSelectedId] = useState<string>('ble-1');
  const [pairedBleIds, setPairedBleIds] = useState<string[]>(['ble-1']);
  const [query, setQuery] = useState('');
  const [wifiBandFilter, setWifiBandFilter] = useState<'all' | '2.4 GHz' | '5 GHz'>(
    'all'
  );
  const [bleCatFilter, setBleCatFilter] = useState<
    'all' | 'hardware' | 'wearable' | 'audio'
  >('all');
  const [nativeNotice, setNativeNotice] = useState<string | null>(null);

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const stopScan = (userTriggered = false) => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (userTriggered) {
      onLog?.(
        'wireless',
        'warn',
        `${scanMode === 'bluetooth' ? 'Bluetooth' : 'Wi-Fi'} scan stopped`
      );
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current !== null) {
        window.clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const startScan = (modeOverride?: ScanMode) => {
    const activeMode = modeOverride ?? scanMode;
    stopScan(false);
    setNativeNotice(null);
    setIsScanning(true);
    setScanPercent(0);
    cyberAudio.playScanPing();
    onLog?.(
      'wireless',
      'info',
      activeMode === 'bluetooth'
        ? 'Bluetooth scan initiated'
        : 'Wi-Fi scan initiated',
      activeMode === 'bluetooth' ? 'BLE 5.2 sweep' : '2.4 & 5 GHz channels'
    );

    if (activeMode === 'bluetooth') {
      setBleDevices([]);
    } else {
      setWifiNetworks([]);
    }

    let step = 0;
    let discoveredCount = 0;
    const sourceList =
      activeMode === 'bluetooth'
        ? DISCOVERABLE_BLE_DEVICES
        : DISCOVERABLE_WIFI_NETWORKS;

    scanIntervalRef.current = window.setInterval(() => {
      step += 4;
      setScanPercent(Math.min(step, 100));

      const targetCount = Math.min(
        sourceList.length,
        Math.floor((step / 92) * sourceList.length)
      );

      if (targetCount > discoveredCount) {
        const nextIdx = discoveredCount;
        discoveredCount = targetCount;
        cyberAudio.playDeviceFoundBeep(nextIdx);
        if (activeMode === 'bluetooth') {
          setBleDevices(DISCOVERABLE_BLE_DEVICES.slice(0, discoveredCount));
        } else {
          setWifiNetworks(DISCOVERABLE_WIFI_NETWORKS.slice(0, discoveredCount));
        }
      }

      if (step >= 100) {
        if (scanIntervalRef.current !== null) {
          window.clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        setIsScanning(false);
        cyberAudio.playNfcMilestoneBeep(100);
        onLog?.(
          'wireless',
          'success',
          activeMode === 'bluetooth'
            ? 'Bluetooth scan completed'
            : 'Wi-Fi scan completed',
          `${sourceList.length} ${activeMode === 'bluetooth' ? 'BLE devices' : 'networks'} discovered`
        );
      }
    }, 85);
  };

  const handleModeSwitch = (nextMode: ScanMode) => {
    if (nextMode === scanMode) return;
    stopScan();
    setScanMode(nextMode);
    setQuery('');
    setNativeNotice(null);
    if (nextMode === 'bluetooth') {
      setSelectedId(bleDevices[0]?.id ?? 'ble-1');
    } else {
      setSelectedId(wifiNetworks[0]?.id ?? 'wifi-1');
    }
  };

  const handleNativeWebBluetooth = async () => {
    setNativeNotice(null);
    const nav = navigator as Navigator & {
      bluetooth?: {
        requestDevice: (opts: { acceptAllDevices: boolean }) => Promise<{
          id: string;
          name?: string;
        }>;
      };
    };

    if (!nav.bluetooth) {
      setNativeNotice(
        'Browser Web Bluetooth is unavailable here; using simulated Flipper BLE sweep.'
      );
      onLog?.(
        'wireless',
        'warn',
        'Web Bluetooth unavailable',
        'Falling back to simulated BLE sweep'
      );
      startScan('bluetooth');
      return;
    }

    try {
      onLog?.('wireless', 'info', 'Browser Web Bluetooth picker opened');
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      const customRecord: BluetoothDeviceRecord = {
        id: `ble-live-${device.id}`,
        name: device.name || 'Paired BLE Peripheral',
        address: 'LIVE:WE:BB:LE:00:01',
        rssi: -34,
        protocol: 'Web Bluetooth',
        category: 'hardware',
        angleDeg: 15,
        services: ['GATT Live Session'],
      };
      setBleDevices((prev) => [
        customRecord,
        ...prev.filter((d) => d.id !== customRecord.id),
      ]);
      setSelectedId(customRecord.id);
      setPairedBleIds((prev) => [...new Set([...prev, customRecord.id])]);
      cyberAudio.playAuthResult('granted');
      onLog?.('wireless', 'success', 'Browser BLE peripheral paired', customRecord.name);
    } catch {
      setNativeNotice(
        'Bluetooth picker cancelled or blocked by sandbox; use Start Bluetooth Scan below.'
      );
      onLog?.('wireless', 'warn', 'Browser BLE selection cancelled');
    }
  };

  // Radar canvas animation
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let animId = 0;
    let angle = 0;

    const activeNodes =
      scanMode === 'bluetooth'
        ? bleDevices.map((d) => ({
            id: d.id,
            label: d.name,
            rssi: d.rssi,
            angleDeg: d.angleDeg,
          }))
        : wifiNetworks.map((w) => ({
            id: w.id,
            label: w.ssid,
            rssi: w.rssi,
            angleDeg: w.angleDeg,
          }));

    const drawRadar = () => {
      const size = 240;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const maxR = size / 2 - 14;

      // Concentric range rings
      ctx.strokeStyle = `rgba(${preset.primaryRgb}, 0.18)`;
      ctx.lineWidth = 1;
      for (const ratio of [0.33, 0.66, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * ratio, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.stroke();

      // Rotating neon sweep wedge while scanning
      if (isScanning && !prefersReducedMotion) {
        const sweepSpan = 0.72;
        const grad = ctx.createConicGradient(angle - sweepSpan, cx, cy);
        grad.addColorStop(0, `rgba(${preset.primaryRgb}, 0)`);
        grad.addColorStop(0.11, `rgba(${preset.primaryRgb}, 0.36)`);
        grad.addColorStop(0.12, `rgba(${preset.primaryRgb}, 0)`);
        grad.addColorStop(1, `rgba(${preset.primaryRgb}, 0)`);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, angle - sweepSpan, angle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Leading sweep beam
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(angle) * maxR,
          cy + Math.sin(angle) * maxR
        );
        ctx.strokeStyle = preset.primary;
        ctx.lineWidth = 1.75;
        ctx.stroke();
      }

      // Plotted wireless nodes
      for (const node of activeNodes) {
        const normDist = Math.min(
          0.92,
          Math.max(0.22, (Math.abs(node.rssi) - 30) / 60)
        );
        const rad = (node.angleDeg * Math.PI) / 180;
        const nx = cx + Math.cos(rad) * (maxR * normDist);
        const ny = cy + Math.sin(rad) * (maxR * normDist);
        const isSel = node.id === selectedId;

        if (isSel) {
          ctx.beginPath();
          ctx.arc(nx, ny, 8, 0, Math.PI * 2);
          ctx.strokeStyle = preset.secondary;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(nx, ny, isSel ? 4.2 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? preset.secondary : preset.primary;
        ctx.shadowColor = isSel ? preset.secondary : preset.primary;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (isScanning && !prefersReducedMotion) {
        angle = (angle + 0.055) % (Math.PI * 2);
        animId = requestAnimationFrame(drawRadar);
      }
    };

    drawRadar();
    return () => cancelAnimationFrame(animId);
  }, [scanMode, isScanning, bleDevices, wifiNetworks, selectedId, preset]);

  const filteredBle = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bleDevices.filter((d) => {
      const matchesCat = bleCatFilter === 'all' || d.category === bleCatFilter;
      const matchesQ =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q) ||
        d.protocol.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [bleDevices, bleCatFilter, query]);

  const filteredWifi = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wifiNetworks.filter((w) => {
      const matchesBand =
        wifiBandFilter === 'all' || w.band === wifiBandFilter;
      const matchesQ =
        !q ||
        w.ssid.toLowerCase().includes(q) ||
        w.bssid.toLowerCase().includes(q) ||
        w.vendor.toLowerCase().includes(q);
      return matchesBand && matchesQ;
    });
  }, [wifiNetworks, wifiBandFilter, query]);

  const selectedBle =
    bleDevices.find((d) => d.id === selectedId) ?? bleDevices[0] ?? null;
  const selectedWifi =
    wifiNetworks.find((w) => w.id === selectedId) ?? wifiNetworks[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Column: Mode Switch, Animated Radar & Scan Controls */}
      <section
        className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md lg:col-span-5"
        style={{
          boxShadow: `0 0 32px -18px rgba(${preset.primaryRgb}, 0.35)`,
        }}
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-white">
              Wireless Scanner
            </h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {isScanning ? `Scanning ${scanPercent}%` : 'Standby'}
            </span>
          </div>

          {/* Bluetooth vs Wi-Fi Mode Switcher */}
          <div
            role="tablist"
            aria-label="Wireless scan mode"
            className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-800/90 bg-[#06090F] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={scanMode === 'bluetooth'}
              onClick={() => handleModeSwitch('bluetooth')}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                scanMode === 'bluetooth'
                  ? 'bg-[#121926] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={
                scanMode === 'bluetooth'
                  ? {
                      boxShadow: `inset 0 0 0 1px rgba(${preset.primaryRgb}, 0.5)`,
                    }
                  : undefined
              }
            >
              <Bluetooth
                className="h-3.5 w-3.5"
                style={{
                  color: scanMode === 'bluetooth' ? preset.primary : undefined,
                }}
              />
              <span>Bluetooth Scan</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={scanMode === 'wifi'}
              onClick={() => handleModeSwitch('wifi')}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                scanMode === 'wifi'
                  ? 'bg-[#121926] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={
                scanMode === 'wifi'
                  ? {
                      boxShadow: `inset 0 0 0 1px rgba(${preset.primaryRgb}, 0.5)`,
                    }
                  : undefined
              }
            >
              <Wifi
                className="h-3.5 w-3.5"
                style={{
                  color: scanMode === 'wifi' ? preset.primary : undefined,
                }}
              />
              <span>Wi-Fi Scan</span>
            </button>
          </div>

          {/* Animated Neon Radar Viewport */}
          <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-[#05080F] py-5">
            <canvas
              ref={radarCanvasRef}
              className="h-[240px] w-[240px]"
              aria-label={
                scanMode === 'bluetooth'
                  ? 'Bluetooth device radar'
                  : 'Wi-Fi access point radar'
              }
            />
            <p className="mt-2 font-mono text-[11px] text-slate-400 tabular-nums">
              {scanMode === 'bluetooth'
                ? `${bleDevices.length} BLE peripherals in range`
                : `${wifiNetworks.length} Wi-Fi access points detected`}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {nativeNotice && (
            <p className="rounded-xl border border-slate-800 bg-[#06090F] px-3.5 py-2 text-xs text-slate-300">
              {nativeNotice}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            {isScanning ? (
              <button
                type="button"
                onClick={() => stopScan(true)}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/30 px-4 py-2 font-display text-xs font-semibold text-rose-200 whitespace-nowrap transition-transform active:scale-95"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Stop Scan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startScan()}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-semibold text-[#05070c] whitespace-nowrap transition-transform active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                  boxShadow: `0 0 22px -4px rgba(${preset.primaryRgb}, 0.55)`,
                }}
              >
                <Radio className="h-3.5 w-3.5" />
                <span>
                  {scanMode === 'bluetooth'
                    ? 'Start Bluetooth Scan'
                    : 'Start Wi-Fi Scan'}
                </span>
              </button>
            )}

            {scanMode === 'bluetooth' && (
              <button
                type="button"
                onClick={handleNativeWebBluetooth}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700/80 bg-[#070A11] px-4 py-2 text-xs font-medium text-slate-200 whitespace-nowrap transition-colors hover:border-slate-500 hover:text-white active:scale-95"
              >
                Browser BLE
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Right Column: Discovered Devices & Inspector */}
      <section className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md lg:col-span-7">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                {scanMode === 'bluetooth'
                  ? 'Nearby Bluetooth Devices'
                  : 'Nearby Wi-Fi Networks'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Select any node to inspect signal telemetry and pairing options.
              </p>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  scanMode === 'bluetooth' ? 'Filter BLE name or MAC' : 'Filter SSID or BSSID'
                }
                className="h-10 w-full rounded-xl border border-slate-800 bg-[#06090F] pr-3 pl-9 text-xs text-white placeholder-slate-500 focus:border-slate-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {scanMode === 'bluetooth'
              ? (['all', 'hardware', 'wearable', 'audio'] as const).map(
                  (cat) => {
                    const active = bleCatFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setBleCatFilter(cat)}
                        className={`min-h-[34px] rounded-lg border px-3 py-1 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                          active
                            ? 'text-white'
                            : 'border-slate-800 bg-[#06090F] text-slate-400 hover:text-slate-200'
                        }`}
                        style={
                          active
                            ? {
                                borderColor: preset.primary,
                                backgroundColor: `rgba(${preset.primaryRgb}, 0.14)`,
                              }
                            : undefined
                        }
                      >
                        {cat}
                      </button>
                    );
                  }
                )
              : (['all', '2.4 GHz', '5 GHz'] as const).map((band) => {
                  const active = wifiBandFilter === band;
                  return (
                    <button
                      key={band}
                      type="button"
                      onClick={() => setWifiBandFilter(band)}
                      className={`min-h-[34px] rounded-lg border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        active
                          ? 'text-white'
                          : 'border-slate-800 bg-[#06090F] text-slate-400 hover:text-slate-200'
                      }`}
                      style={
                        active
                          ? {
                              borderColor: preset.primary,
                              backgroundColor: `rgba(${preset.primaryRgb}, 0.14)`,
                            }
                          : undefined
                      }
                    >
                      {band === 'all' ? 'All Bands' : band}
                    </button>
                  );
                })}
          </div>

          {/* Discovered List */}
          <div className="mt-4 divide-y divide-slate-800/80">
            {scanMode === 'bluetooth' ? (
              filteredBle.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">
                  {isScanning
                    ? 'Sweeping 2.4 GHz BLE advertising channels...'
                    : 'No Bluetooth devices match your filter.'}
                </p>
              ) : (
                filteredBle.map((dev) => {
                  const isSelected = selectedId === dev.id;
                  const isPaired = pairedBleIds.includes(dev.id);
                  return (
                    <div
                      key={dev.id}
                      onClick={() => setSelectedId(dev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(dev.id);
                        }
                      }}
                      className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3.5 transition-colors hover:bg-white/[0.03]"
                      style={
                        isSelected
                          ? { backgroundColor: `rgba(${preset.primaryRgb}, 0.08)` }
                          : undefined
                      }
                    >
                      <div className="min-w-0">
                        <p className="font-display text-sm font-medium text-white">
                          {dev.name}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                          {dev.address} · {dev.protocol} · {dev.rssi} dBm
                          {isPaired ? ' · Paired' : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <SignalBars rssi={dev.rssi} color={preset.primary} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(dev.id);
                            setPairedBleIds((prev) =>
                              isPaired
                                ? prev.filter((id) => id !== dev.id)
                                : [...prev, dev.id]
                            );
                            cyberAudio.playPinKeyBeep(isPaired ? '2' : '8');
                            onLog?.(
                              'wireless',
                              isPaired ? 'warn' : 'success',
                              isPaired
                                ? 'BLE peripheral disconnected'
                                : 'BLE peripheral paired',
                              dev.name
                            );
                          }}
                          className="min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
                          style={{
                            borderColor: isPaired
                              ? preset.primary
                              : 'rgba(148, 163, 184, 0.25)',
                            color: isPaired ? preset.primary : '#E2E8F0',
                          }}
                        >
                          {isPaired ? 'Disconnect' : 'Pair'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : filteredWifi.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">
                {isScanning
                  ? 'Listening for 802.11 beacon frames...'
                  : 'No Wi-Fi networks match your filter.'}
              </p>
            ) : (
              filteredWifi.map((net) => {
                const isSelected = selectedId === net.id;
                return (
                  <div
                    key={net.id}
                    onClick={() => setSelectedId(net.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(net.id);
                      }
                    }}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3.5 transition-colors hover:bg-white/[0.03]"
                    style={
                      isSelected
                        ? { backgroundColor: `rgba(${preset.primaryRgb}, 0.08)` }
                        : undefined
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-display text-sm font-medium text-white">
                        {net.ssid}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                        {net.bssid} · CH {net.channel} · {net.band} ·{' '}
                        {net.security} · {net.rssi} dBm
                      </p>
                    </div>

                    <SignalBars rssi={net.rssi} color={preset.primary} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Node Detail Strip */}
        <div className="mt-6 border-t border-slate-800/80 pt-4">
          {scanMode === 'bluetooth' && selectedBle ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-medium text-white">
                  Inspected: {selectedBle.name}
                </p>
                <p className="mt-0.5 font-mono text-slate-400">
                  Services: {selectedBle.services.join(' · ')}
                </p>
              </div>
              <span
                className="font-mono tabular-nums"
                style={{ color: preset.primary }}
              >
                {selectedBle.rssi} dBm
              </span>
            </div>
          ) : scanMode === 'wifi' && selectedWifi ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-medium text-white">
                  Inspected: {selectedWifi.ssid}
                </p>
                <p className="mt-0.5 font-mono text-slate-400">
                  Vendor: {selectedWifi.vendor} · Channel {selectedWifi.channel}{' '}
                  · {selectedWifi.security}
                </p>
              </div>
              <span
                className="font-mono tabular-nums"
                style={{ color: preset.primary }}
              >
                {selectedWifi.rssi} dBm
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Run a scan to inspect nearby wireless nodes.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
