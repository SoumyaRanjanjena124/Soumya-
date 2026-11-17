import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Cpu,
  Lock,
  Nfc,
  Play,
  Radio,
  Search,
  Terminal,
  Wifi,
} from 'lucide-react';
import {
  BadUsbScript,
  CyberLogEntry,
  GpioPin,
  LogCategory,
  LogLevel,
  NeonPreset,
  NfcCardRecord,
  WorkspaceTab,
} from '../types/flipper';
import { CyberLogConsole } from './CyberLogConsole';
import { WirelessScanner } from './WirelessScanner';

interface CompanionWorkspaceProps {
  preset: NeonPreset;
  operatorId: string;
  onLockDevice: () => void;
  initialTab?: WorkspaceTab;
  logs: CyberLogEntry[];
  onClearLogs: () => void;
  onLog: (
    category: LogCategory,
    level: LogLevel,
    message: string,
    detail?: string
  ) => void;
}

const INITIAL_NFC_CARDS: NfcCardRecord[] = [
  {
    id: 'card-1',
    name: 'Studio Building Badge',
    protocol: 'Mifare Classic 1K',
    uid: 'A4:7F:29:C1',
    frequency: '13.56 MHz',
    lastUsed: '2 hours ago',
  },
  {
    id: 'card-2',
    name: 'Parking Gate Transponder',
    protocol: 'NTAG215',
    uid: '04:81:E2:1A:4D:09:80',
    frequency: '13.56 MHz',
    lastUsed: 'Yesterday',
  },
  {
    id: 'card-3',
    name: 'Lab Locker Keyfob',
    protocol: 'EM4100',
    uid: '2B:00:94:18:AF',
    frequency: '125 kHz',
    lastUsed: '3 days ago',
  },
  {
    id: 'card-4',
    name: 'Server Rack Access',
    protocol: 'DESFire EV2',
    uid: '04:33:C0:92:11:7A:02',
    frequency: '13.56 MHz',
    lastUsed: 'Last week',
  },
];

const INITIAL_GPIO_PINS: GpioPin[] = [
  { number: 1, label: '5V', voltage: '5.0V', active: true, role: 'power' },
  { number: 2, label: 'A7', voltage: '0.0V', active: false, role: 'io' },
  { number: 3, label: 'A6', voltage: '3.3V', active: true, role: 'io' },
  { number: 4, label: 'A4', voltage: '0.0V', active: false, role: 'io' },
  { number: 5, label: 'B3', voltage: '0.0V', active: false, role: 'io' },
  { number: 6, label: 'B2', voltage: '3.3V', active: true, role: 'io' },
  { number: 7, label: 'C3', voltage: '0.0V', active: false, role: 'io' },
  { number: 8, label: 'GND', voltage: '0.0V', active: false, role: 'ground' },
  { number: 9, label: '3V3', voltage: '3.3V', active: true, role: 'power' },
  { number: 10, label: 'SWC', voltage: '0.0V', active: false, role: 'io' },
];

const BADUSB_SCRIPTS: BadUsbScript[] = [
  {
    id: 'sys-audit',
    title: 'Workstation Hardware Audit',
    targetOs: 'macOS / Linux',
    lineCount: 6,
    summary: 'Collects local OS version, USB bus devices, and network interface summary.',
    lines: [
      'REM Flipper Zero Diagnostic Script',
      'DELAY 400',
      'GUI SPACE',
      'STRING terminal',
      'ENTER',
      'STRING uname -a && system_profiler SPUSBDataType',
    ],
  },
  {
    id: 'wifi-diag',
    title: 'WLAN Channel Diagnostics',
    targetOs: 'Windows 11',
    lineCount: 5,
    summary: 'Opens PowerShell and lists active wireless driver channels and signal quality.',
    lines: [
      'DELAY 500',
      'GUI r',
      'STRING powershell',
      'ENTER',
      'STRING netsh wlan show interfaces',
    ],
  },
];

export function CompanionWorkspace({
  preset,
  operatorId,
  onLockDevice,
  initialTab = 'subghz',
  logs,
  onClearLogs,
  onLog,
}: CompanionWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [frequency, setFrequency] = useState<number>(433.92);
  const [gain, setGain] = useState<number>(68);
  const [captures, setCaptures] = useState<
    { id: string; freq: string; modulation: string; rssi: string; time: string }[]
  >([
    {
      id: 'cap-1',
      freq: '433.92 MHz',
      modulation: 'AM650',
      rssi: '-42 dBm',
      time: '21:51:08',
    },
    {
      id: 'cap-2',
      freq: '315.00 MHz',
      modulation: 'FM476',
      rssi: '-58 dBm',
      time: '21:49:44',
    },
  ]);

  const [nfcQuery, setNfcQuery] = useState('');
  const [emulatingCardId, setEmulatingCardId] = useState<string | null>(null);
  const [pins, setPins] = useState<GpioPin[]>(INITIAL_GPIO_PINS);
  const [selectedScriptId, setSelectedScriptId] = useState(BADUSB_SCRIPTS[0].id);
  const [runningLineIndex, setRunningLineIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Sub-GHz Spectrum Waveform Canvas
  useEffect(() => {
    if (activeTab !== 'subghz') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let animId = 0;
    let phaseShift = 0;

    const renderWave = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(rect.width, 300);
      const h = Math.max(rect.height, 180);

      if (canvas.width !== Math.floor(w * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 32; y < h; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 48; x < w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Signal spectrum curve
      const ampScale = (gain / 100) * (h * 0.34);
      const centerFreqFactor = frequency === 433.92 ? 0.5 : frequency === 315 ? 0.34 : 0.68;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const normX = x / w;
        const distFromPeak = Math.abs(normX - centerFreqFactor);
        const carrierEnvelope = Math.exp(-Math.pow(distFromPeak * 7.5, 2));
        const noise =
          Math.sin(x * 0.08 + phaseShift * 1.9) * 5 +
          Math.cos(x * 0.21 - phaseShift * 2.4) * 3;
        const peak =
          carrierEnvelope *
          ampScale *
          (0.75 + 0.25 * Math.sin(phaseShift * 3.2 + normX * 14));
        const y = h * 0.78 - peak - Math.abs(noise);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = preset.primary;
      ctx.lineWidth = 2;
      ctx.shadowColor = preset.primary;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Fill underneath waveform
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgba(${preset.primaryRgb}, 0.26)`);
      grad.addColorStop(1, `rgba(${preset.primaryRgb}, 0.01)`);
      ctx.fillStyle = grad;
      ctx.fill();

      if (!prefersReducedMotion) {
        phaseShift += 0.035;
        animId = requestAnimationFrame(renderWave);
      }
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, [activeTab, frequency, gain, preset]);

  const handleCaptureSignal = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const rssiVal = Math.round(-75 + (gain / 100) * 40);
    setCaptures((prev) => [
      {
        id: `cap-${Date.now()}`,
        freq: `${frequency.toFixed(2)} MHz`,
        modulation: frequency === 868.35 ? 'FSK476' : 'AM650',
        rssi: `${rssiVal} dBm`,
        time: `${hh}:${mm}:${ss}`,
      },
      ...prev.slice(0, 5),
    ]);
    onLog(
      'wireless',
      'success',
      'Sub-GHz signal captured',
      `${frequency.toFixed(2)} MHz · ${rssiVal} dBm`
    );
  };

  const filteredNfcCards = useMemo(() => {
    const q = nfcQuery.trim().toLowerCase();
    if (!q) return INITIAL_NFC_CARDS;
    return INITIAL_NFC_CARDS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.protocol.toLowerCase().includes(q) ||
        c.uid.toLowerCase().includes(q)
    );
  }, [nfcQuery]);

  const handleTogglePin = (pinNumber: number) => {
    const targetPin = pins.find((p) => p.number === pinNumber);
    if (!targetPin || targetPin.role !== 'io') return;
    const nextActive = !targetPin.active;
    onLog(
      'hardware',
      nextActive ? 'success' : 'info',
      `GPIO pin ${targetPin.label} set to ${nextActive ? 'HIGH (3.3V)' : 'LOW (0.0V)'}`
    );
    setPins((prev) =>
      prev.map((pin) => {
        if (pin.number !== pinNumber || pin.role !== 'io') return pin;
        return {
          ...pin,
          active: nextActive,
          voltage: nextActive ? '3.3V' : '0.0V',
        };
      })
    );
  };

  const selectedScript =
    BADUSB_SCRIPTS.find((s) => s.id === selectedScriptId) || BADUSB_SCRIPTS[0];

  useEffect(() => {
    if (runningLineIndex === null) return;
    if (runningLineIndex >= selectedScript.lines.length) {
      const doneTimer = setTimeout(() => setRunningLineIndex(null), 900);
      return () => clearTimeout(doneTimer);
    }
    const stepTimer = setTimeout(() => {
      setRunningLineIndex((i) => (i === null ? null : i + 1));
    }, 340);
    return () => clearTimeout(stepTimer);
  }, [runningLineIndex, selectedScript.lines.length]);

  const navItems: { id: WorkspaceTab; label: string; icon: typeof Radio }[] = [
    { id: 'subghz', label: 'Sub-GHz', icon: Radio },
    { id: 'wireless', label: 'BLE / Wi-Fi', icon: Wifi },
    { id: 'nfc', label: 'NFC Vault', icon: Nfc },
    { id: 'gpio', label: 'GPIO Pins', icon: Cpu },
    { id: 'badusb', label: 'BadUSB', icon: Terminal },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12 sm:px-8"
    >
      {/* Clean 3-Zone Top Bar Contract */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 py-5 sm:gap-8">
        {/* Zone 1: Single-line Wordmark */}
        <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          SOUMYA Flipper Zero
        </span>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Workspace modules"
          className="flex items-center gap-2 overflow-x-auto sm:gap-5"
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex min-h-[40px] items-center gap-2 px-2.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 ${
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="workspace-nav-underline"
                    className="absolute inset-x-1 bottom-0 h-[2px] rounded-full"
                    style={{
                      backgroundColor: preset.primary,
                      boxShadow: `0 0 10px ${preset.primary}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <button
          type="button"
          onClick={onLockDevice}
          className="flex min-h-[42px] items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-all duration-150 hover:bg-white/5 active:scale-95 focus-visible:outline-2"
          style={{
            borderColor: `rgba(${preset.primaryRgb}, 0.5)`,
            boxShadow: `0 0 16px -6px rgba(${preset.primaryRgb}, 0.45)`,
          }}
        >
          <Lock className="h-3.5 w-3.5" style={{ color: preset.primary }} />
          <span>Lock Device</span>
        </button>
      </header>

      {/* Quiet Device Session Context Line (unboxed text metadata) */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono">
          <span>Paired unit: {operatorId || 'fz-zero-042'}</span>
          <span aria-hidden="true">·</span>
          <span>Firmware 1.1.2</span>
          <span aria-hidden="true">·</span>
          <span>Battery 98%</span>
        </div>
        <span className="font-mono text-slate-500">
          {preset.label} illumination active
        </span>
      </div>

      {/* Main Module Viewport */}
      <main className="mt-6 flex-1">
        {activeTab === 'wireless' && (
          <WirelessScanner preset={preset} onLog={onLog} />
        )}

        {activeTab === 'subghz' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <section
              className="rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md lg:col-span-8"
              style={{
                boxShadow: `0 0 32px -18px rgba(${preset.primaryRgb}, 0.35)`,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">
                    Sub-GHz Spectrum Analyzer
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Real-time RF carrier sweep across ISM bands.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureSignal}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-semibold text-[#05070c] whitespace-nowrap transition-transform active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    boxShadow: `0 0 20px -4px rgba(${preset.primaryRgb}, 0.55)`,
                  }}
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>Capture Signal</span>
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-800 bg-[#05080F]">
                <canvas
                  ref={canvasRef}
                  className="h-[230px] w-full"
                  aria-label="Sub-GHz spectrum waveform"
                />
              </div>

              {/* Frequency & Gain Controls */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  {[315.0, 433.92, 868.35].map((band) => {
                    const selected = frequency === band;
                    return (
                      <button
                        key={band}
                        type="button"
                        onClick={() => setFrequency(band)}
                        className={`min-h-[40px] rounded-lg border px-3.5 py-2 font-mono text-xs tabular-nums transition-colors ${
                          selected
                            ? 'text-white'
                            : 'border-slate-800 bg-[#070A11] text-slate-400 hover:text-white'
                        }`}
                        style={
                          selected
                            ? {
                                borderColor: preset.primary,
                                backgroundColor: `rgba(${preset.primaryRgb}, 0.14)`,
                              }
                            : undefined
                        }
                      >
                        {band.toFixed(2)} MHz
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-3 text-xs text-slate-300">
                  <span className="font-mono">Gain {gain}%</span>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={gain}
                    onChange={(e) => setGain(Number(e.target.value))}
                    className="w-32 accent-cyan-400"
                  />
                </label>
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md lg:col-span-4">
              <h3 className="font-display text-base font-semibold text-white">
                Captured Signals
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Recent RF frames logged during this session.
              </p>

              <div className="mt-4 divide-y divide-slate-800/80">
                {captures.map((cap) => (
                  <div
                    key={cap.id}
                    className="flex items-center justify-between py-3 font-mono text-xs"
                  >
                    <div>
                      <p className="font-medium text-white tabular-nums">
                        {cap.freq}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {cap.modulation} · {cap.time}
                      </p>
                    </div>
                    <span
                      className="tabular-nums"
                      style={{ color: preset.primary }}
                    >
                      {cap.rssi}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'nfc' && (
          <section className="rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  NFC & RFID Key Vault
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select a stored transponder to start or stop hardware emulation.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={nfcQuery}
                  onChange={(e) => setNfcQuery(e.target.value)}
                  placeholder="Search cards or UID"
                  className="h-11 w-full rounded-xl border border-slate-800 bg-[#06090F] pr-4 pl-10 text-xs text-white placeholder-slate-500 focus:border-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 divide-y divide-slate-800/80">
              {filteredNfcCards.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  No stored cards match "{nfcQuery}".
                </p>
              ) : (
                filteredNfcCards.map((card) => {
                  const isEmulating = emulatingCardId === card.id;
                  return (
                    <div
                      key={card.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="font-display text-base font-medium text-white">
                          {card.name}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                          {card.protocol} · UID {card.uid} · {card.frequency} ·{' '}
                          {card.lastUsed}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEmulatingCardId(isEmulating ? null : card.id);
                          onLog(
                            'hardware',
                            isEmulating ? 'info' : 'success',
                            isEmulating
                              ? 'NFC card emulation stopped'
                              : 'NFC card emulation started',
                            `${card.name} (${card.uid})`
                          );
                        }}
                        className="min-h-[42px] rounded-xl border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
                        style={{
                          borderColor: isEmulating
                            ? preset.primary
                            : 'rgba(148, 163, 184, 0.25)',
                          backgroundColor: isEmulating
                            ? `rgba(${preset.primaryRgb}, 0.16)`
                            : '#070A11',
                          color: isEmulating ? preset.primary : '#E2E8F0',
                          boxShadow: isEmulating
                            ? `0 0 18px -4px rgba(${preset.primaryRgb}, 0.55)`
                            : 'none',
                        }}
                      >
                        {isEmulating ? 'Stop Emulation' : 'Emulate Card'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {activeTab === 'gpio' && (
          <section className="rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  GPIO Pin Controller
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Click any programmable I/O pin to toggle logic level between 0V and 3.3V.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {pins.filter((p) => p.role === 'io' && p.active).length} active I/O lines
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {pins.map((pin) => {
                const isPowerOrGnd = pin.role !== 'io';
                return (
                  <button
                    key={pin.number}
                    type="button"
                    disabled={isPowerOrGnd}
                    onClick={() => handleTogglePin(pin.number)}
                    className="flex min-h-[84px] flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-150 active:scale-95 disabled:cursor-default disabled:opacity-75"
                    style={{
                      borderColor: pin.active
                        ? preset.primary
                        : 'rgba(148, 163, 184, 0.2)',
                      backgroundColor: pin.active
                        ? `rgba(${preset.primaryRgb}, 0.12)`
                        : '#06090F',
                      boxShadow: pin.active
                        ? `0 0 18px -6px rgba(${preset.primaryRgb}, 0.45)`
                        : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-400 tabular-nums">
                        Pin {pin.number}
                      </span>
                      <span className="font-semibold text-white">
                        {pin.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs tabular-nums">
                      <span
                        style={{
                          color: pin.active ? preset.primary : '#94A3B8',
                        }}
                      >
                        {pin.voltage}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isPowerOrGnd
                          ? pin.role.toUpperCase()
                          : pin.active
                          ? 'HIGH'
                          : 'LOW'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'badusb' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md lg:col-span-5">
              <h2 className="font-display text-xl font-semibold text-white">
                BadUSB Payloads
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select a diagnostic HID script to preview or simulate execution.
              </p>

              <div className="mt-5 space-y-3">
                {BADUSB_SCRIPTS.map((script) => {
                  const selected = script.id === selectedScript.id;
                  return (
                    <button
                      key={script.id}
                      type="button"
                      onClick={() => {
                        setSelectedScriptId(script.id);
                        setRunningLineIndex(null);
                      }}
                      className="w-full rounded-xl border p-4 text-left transition-all duration-150"
                      style={{
                        borderColor: selected
                          ? preset.primary
                          : 'rgba(148, 163, 184, 0.18)',
                        backgroundColor: selected
                          ? `rgba(${preset.primaryRgb}, 0.1)`
                          : '#06090F',
                      }}
                    >
                      <p className="font-display text-base font-medium text-white">
                        {script.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {script.summary}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-slate-500">
                        {script.targetOs} · {script.lineCount} lines
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 p-6 backdrop-blur-md lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    {selectedScript.title}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                    {selectedScript.targetOs} · HID Keyboard Profile
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRunningLineIndex(0);
                    onLog(
                      'hardware',
                      'info',
                      'BadUSB simulation started',
                      selectedScript.title
                    );
                  }}
                  disabled={runningLineIndex !== null}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-semibold text-[#05070c] whitespace-nowrap transition-transform active:scale-95 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    boxShadow: `0 0 20px -4px rgba(${preset.primaryRgb}, 0.55)`,
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>
                    {runningLineIndex !== null ? 'Running...' : 'Run Simulation'}
                  </span>
                </button>
              </div>

              <div className="mt-5 space-y-1.5 rounded-xl border border-slate-800 bg-[#05080F] p-4 font-mono text-xs">
                {selectedScript.lines.map((line, idx) => {
                  const isCurrent = runningLineIndex === idx;
                  const isDone =
                    runningLineIndex !== null && runningLineIndex > idx;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors"
                      style={{
                        backgroundColor: isCurrent
                          ? `rgba(${preset.primaryRgb}, 0.16)`
                          : 'transparent',
                        color: isCurrent
                          ? preset.primary
                          : isDone
                          ? '#E2E8F0'
                          : '#94A3B8',
                      }}
                    >
                      <span className="w-5 text-right text-slate-600 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="truncate">{line}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      <div className="mt-6">
        <CyberLogConsole preset={preset} logs={logs} onClear={onClearLogs} />
      </div>
    </motion.div>
  );
}
