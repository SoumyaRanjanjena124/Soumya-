import { FormEvent, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bluetooth,
  CheckCircle2,
  Delete,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Nfc,
  Radio,
  ShieldAlert,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react';
import {
  AuthMethod,
  LogCategory,
  LogLevel,
  LoginPhase,
  NeonPreset,
} from '../types/flipper';
import { cyberAudio } from '../utils/audioFeedback';

interface LoginPanelProps {
  preset: NeonPreset;
  phase: LoginPhase;
  authMethod: AuthMethod;
  onSelectMethod: (method: AuthMethod) => void;
  operatorId: string;
  onOperatorIdChange: (val: string) => void;
  passkey: string;
  onPasskeyChange: (val: string) => void;
  pinValue: string;
  onPinDigit: (digit: string) => void;
  onPinBackspace: () => void;
  onPinClear: () => void;
  onSubmitPasskey: (e: FormEvent) => void;
  onSubmitPin: () => void;
  onStartNfcScan: () => void;
  onStopNfcScan: () => void;
  onQuickNfcVerify: () => void;
  scanProgress: number;
  errorMessage: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onWirelessPair: (deviceLabel: string) => void;
  onLog?: (
    category: LogCategory,
    level: LogLevel,
    message: string,
    detail?: string
  ) => void;
}

export function LoginPanel({
  preset,
  phase,
  authMethod,
  onSelectMethod,
  operatorId,
  onOperatorIdChange,
  passkey,
  onPasskeyChange,
  pinValue,
  onPinDigit,
  onPinBackspace,
  onPinClear,
  onSubmitPasskey,
  onSubmitPin,
  onStartNfcScan,
  onStopNfcScan,
  onQuickNfcVerify,
  scanProgress,
  errorMessage,
  soundEnabled,
  onToggleSound,
  onWirelessPair,
  onLog,
}: LoginPanelProps) {
  const [showPasskey, setShowPasskey] = useState(false);
  const [wirelessType, setWirelessType] = useState<'ble' | 'wifi'>('ble');
  const [wirelessScanning, setWirelessScanning] = useState(false);

  const isBusy = phase === 'booting' || phase === 'verifying' || phase === 'granted';
  const activeColor = phase === 'denied' ? '#FF445A' : preset.primary;
  const activeRgb = phase === 'denied' ? '255, 68, 90' : preset.primaryRgb;

  const tabs: { id: AuthMethod; label: string; icon: typeof KeyRound }[] = [
    { id: 'passkey', label: 'Passkey', icon: KeyRound },
    { id: 'pin', label: 'Device PIN', icon: Fingerprint },
    { id: 'nfc', label: 'NFC Scan', icon: Nfc },
    { id: 'ble', label: 'BLE / Wi-Fi', icon: Wifi },
  ];

  const wirelessNodes =
    wirelessType === 'ble'
      ? [
          {
            id: 'fz-ble-042',
            title: 'Flipper Zero · Cyber042',
            meta: 'BLE 5.2 · 80:E1:26:4B:19:A2 · -38 dBm',
          },
          {
            id: 'fz-ble-091',
            title: 'ESP32 Marauder Bridge',
            meta: 'BLE 5.0 · 7C:9E:BD:31:04:F8 · -52 dBm',
          },
        ]
      : [
          {
            id: 'fz-wifi-dev',
            title: 'Flipper_AP_Bridge',
            meta: '2.4 GHz · CH 6 · WPA2 · -46 dBm',
          },
          {
            id: 'fz-wifi-lab',
            title: 'CYBERLAB_CORE_5G',
            meta: '5 GHz · CH 36 · WPA3 · -41 dBm',
          },
        ];

  const handleRunQuickWirelessScan = () => {
    setWirelessScanning(true);
    cyberAudio.playScanPing();
    onLog?.(
      'wireless',
      'info',
      wirelessType === 'ble'
        ? 'Bluetooth scan initiated'
        : 'Wi-Fi scan initiated',
      'Login quick discovery'
    );
    window.setTimeout(() => {
      cyberAudio.playDeviceFoundBeep(0);
    }, 340);
    window.setTimeout(() => {
      cyberAudio.playDeviceFoundBeep(1);
      setWirelessScanning(false);
      onLog?.(
        'wireless',
        'success',
        wirelessType === 'ble'
          ? 'Bluetooth scan completed'
          : 'Wi-Fi scan completed',
        `${wirelessNodes.length} nearby nodes available`
      );
    }, 820);
  };

  const handleFillDemo = () => {
    onOperatorIdChange('fz-zero-042');
    onPasskeyChange('cyber-dolphin-433');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border bg-[#0B0F17]/90 p-6 backdrop-blur-xl sm:p-8"
      style={{
        borderColor: `rgba(${activeRgb}, 0.36)`,
        boxShadow: `0 24px 64px -18px rgba(0, 0, 0, 0.85), 0 0 36px -14px rgba(${activeRgb}, 0.28)`,
      }}
    >
      {/* Top Neon Edge Beam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px]"
        style={{
          background: `linear-gradient(90deg, transparent 5%, ${activeColor} 50%, ${preset.secondary} 80%, transparent 95%)`,
        }}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <span>Hardware Companion · USB-C / BLE 5.2</span>
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Mute audio feedback' : 'Enable audio feedback'}
            className="flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-800/90 bg-[#06090F] px-2.5 py-1 font-mono text-[11px] text-slate-300 whitespace-nowrap transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-2"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" style={{ color: preset.primary }} />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Operator Sign In
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
          Authenticate with your paired Flipper Zero unit to unlock radio, NFC, and GPIO tools.
        </p>
      </div>

      {/* Auth Method Segmented Switcher */}
      <div
        role="tablist"
        aria-label="Authentication method"
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-slate-800/90 bg-[#06090F] p-1 sm:grid-cols-4"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = authMethod === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={isBusy}
              onClick={() => onSelectMethod(tab.id)}
              className={`relative flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                active
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              } disabled:opacity-50`}
            >
              {active && (
                <motion.div
                  layoutId="auth-tab-bg"
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 rounded-lg border bg-[#121926]"
                  style={{
                    borderColor: `rgba(${activeRgb}, 0.55)`,
                    boxShadow: `0 0 18px -6px rgba(${activeRgb}, 0.45)`,
                  }}
                />
              )}
              <Icon
                className="relative z-10 h-3.5 w-3.5 shrink-0"
                style={{ color: active ? activeColor : undefined }}
              />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Verification / Granted Animated State Overlay */}
      <AnimatePresence mode="wait">
        {phase === 'verifying' || phase === 'granted' ? (
          <motion.div
            key="auth-sequence"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex min-h-[296px] flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-[#070A11] p-6 text-center"
          >
            {phase === 'verifying' ? (
              <>
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-transparent"
                    style={{
                      borderTopColor: preset.primary,
                      borderRightColor: preset.secondary,
                      filter: `drop-shadow(0 0 8px ${preset.primary})`,
                    }}
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
                    className="absolute inset-2.5 rounded-full border border-dashed"
                    style={{ borderColor: `rgba(${preset.primaryRgb}, 0.5)` }}
                  />
                  <Nfc
                    className="h-7 w-7"
                    style={{ color: preset.primary }}
                  />
                </div>
                <p className="mt-5 font-display text-lg font-semibold text-white">
                  Verifying Cryptographic Key
                </p>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  Establishing encrypted channel with device
                </p>
                <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.35, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${preset.primary}, ${preset.secondary})`,
                      boxShadow: `0 0 12px ${preset.primary}`,
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full border"
                  style={{
                    borderColor: preset.primary,
                    backgroundColor: `rgba(${preset.primaryRgb}, 0.14)`,
                    boxShadow: `0 0 32px rgba(${preset.primaryRgb}, 0.45)`,
                  }}
                >
                  <CheckCircle2
                    className="h-10 w-10"
                    style={{ color: preset.primary }}
                  />
                </motion.div>
                <p className="mt-5 font-display text-xl font-semibold text-white">
                  Access Granted
                </p>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  Opening Flipper Zero workspace
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={authMethod}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* METHOD 1: PASSKEY */}
            {authMethod === 'passkey' && (
              <form onSubmit={onSubmitPasskey} className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="operator-id"
                      className="text-xs font-medium text-slate-300"
                    >
                      Device Serial or Callsign
                    </label>
                    <button
                      type="button"
                      onClick={handleFillDemo}
                      className="text-xs font-medium transition-colors hover:underline focus-visible:outline-2"
                      style={{ color: preset.primary }}
                    >
                      Fill Demo Key
                    </button>
                  </div>
                  <input
                    id="operator-id"
                    type="text"
                    value={operatorId}
                    onChange={(e) => onOperatorIdChange(e.target.value)}
                    placeholder="fz-zero-042"
                    autoComplete="username"
                    disabled={isBusy}
                    className="h-12 w-full rounded-xl border border-slate-800 bg-[#06090F] px-4 font-mono text-sm text-white placeholder-slate-600 transition-all duration-150 focus:outline-none"
                    style={{
                      boxShadow: operatorId
                        ? `inset 0 0 0 1px rgba(${preset.primaryRgb}, 0.25)`
                        : undefined,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = preset.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${preset.primaryRgb}, 0.18)`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="operator-passkey"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Passkey
                  </label>
                  <div className="relative">
                    <input
                      id="operator-passkey"
                      type={showPasskey ? 'text' : 'password'}
                      value={passkey}
                      onChange={(e) => onPasskeyChange(e.target.value)}
                      placeholder="Enter companion passkey"
                      autoComplete="current-password"
                      disabled={isBusy}
                      className="h-12 w-full rounded-xl border border-slate-800 bg-[#06090F] pr-12 pl-4 font-mono text-sm text-white placeholder-slate-600 transition-all duration-150 focus:outline-none"
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = preset.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${preset.primaryRgb}, 0.18)`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasskey((v) => !v)}
                      aria-label={showPasskey ? 'Hide passkey' : 'Show passkey'}
                      className="absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-white focus-visible:outline-2"
                    >
                      {showPasskey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="group relative mt-2 flex h-12 w-full items-center justify-center overflow-hidden rounded-xl font-display text-sm font-semibold text-[#05070c] transition-transform duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    boxShadow: `0 0 26px -4px rgba(${preset.primaryRgb}, 0.55)`,
                  }}
                >
                  <span className="relative z-10">Sign In</span>
                </button>

                <p className="text-center font-mono text-[11px] text-slate-500">
                  Any non-empty key unlocks demo mode or click Fill Demo Key
                </p>
              </form>
            )}

            {/* METHOD 2: 4-DIGIT PIN */}
            {authMethod === 'pin' && (
              <div className="space-y-4">
                {/* 4-Slot Illuminated PIN Indicators */}
                <div className="flex items-center justify-center gap-3 py-1">
                  {[0, 1, 2, 3].map((idx) => {
                    const filled = idx < pinValue.length;
                    return (
                      <motion.div
                        key={idx}
                        animate={{ scale: filled ? [1, 1.08, 1] : 1 }}
                        transition={{ duration: 0.16 }}
                        className="flex h-13 w-12 items-center justify-center rounded-xl border font-mono text-lg font-semibold tabular-nums transition-all duration-150"
                        style={{
                          borderColor: filled
                            ? activeColor
                            : 'rgba(148, 163, 184, 0.2)',
                          backgroundColor: filled
                            ? `rgba(${activeRgb}, 0.14)`
                            : '#06090F',
                          color: '#FFFFFF',
                          boxShadow: filled
                            ? `0 0 18px -4px rgba(${activeRgb}, 0.5)`
                            : 'none',
                        }}
                      >
                        {filled ? pinValue[idx] : ''}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Numeric Touch Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={isBusy}
                      onClick={() => onPinDigit(digit)}
                      className="flex min-h-[46px] items-center justify-center rounded-xl border border-slate-800/90 bg-[#080C14] font-mono text-base font-medium text-slate-100 transition-all duration-150 hover:border-slate-600 hover:bg-[#101725] active:scale-95 focus-visible:outline-2"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={onPinClear}
                    className="flex min-h-[46px] items-center justify-center rounded-xl border border-slate-800/90 bg-[#080C14] text-xs font-medium text-slate-400 transition-all duration-150 hover:border-slate-600 hover:text-white active:scale-95 focus-visible:outline-2"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onPinDigit('0')}
                    className="flex min-h-[46px] items-center justify-center rounded-xl border border-slate-800/90 bg-[#080C14] font-mono text-base font-medium text-slate-100 transition-all duration-150 hover:border-slate-600 hover:bg-[#101725] active:scale-95 focus-visible:outline-2"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={onPinBackspace}
                    aria-label="Delete last digit"
                    className="flex min-h-[46px] items-center justify-center rounded-xl border border-slate-800/90 bg-[#080C14] text-slate-300 transition-all duration-150 hover:border-slate-600 hover:text-white active:scale-95 focus-visible:outline-2"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isBusy || pinValue.length < 4}
                  onClick={onSubmitPin}
                  className="flex h-12 w-full items-center justify-center rounded-xl font-display text-sm font-semibold text-[#05070c] transition-all duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    boxShadow:
                      pinValue.length === 4
                        ? `0 0 24px -4px rgba(${preset.primaryRgb}, 0.55)`
                        : 'none',
                  }}
                >
                  Unlock with PIN
                </button>

                <p className="text-center font-mono text-[11px] text-slate-500">
                  Demo PIN: 2486 · Or use hardware D-Pad
                </p>
              </div>
            )}

            {/* METHOD 3: NFC KEYCARD TAP */}
            {authMethod === 'nfc' && (
              <div className="flex flex-col items-center py-2 text-center">
                <button
                  type="button"
                  onPointerDown={onStartNfcScan}
                  onPointerUp={onStopNfcScan}
                  onPointerLeave={onStopNfcScan}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onQuickNfcVerify();
                    }
                  }}
                  aria-label="Hold to scan NFC hardware token"
                  className="group relative flex h-40 w-40 items-center justify-center rounded-full border border-slate-800 bg-[#06090F] transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4"
                  style={{
                    boxShadow:
                      phase === 'scanning'
                        ? `0 0 38px rgba(${preset.primaryRgb}, 0.5)`
                        : `0 0 20px -8px rgba(${preset.primaryRgb}, 0.25)`,
                  }}
                >
                  {/* Concentric SVG progress ring */}
                  <svg
                    viewBox="0 0 120 120"
                    className="absolute inset-0 h-full w-full -rotate-90"
                    aria-hidden="true"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.14)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke={preset.primary}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={339.29}
                      strokeDashoffset={
                        339.29 - (339.29 * Math.min(scanProgress, 100)) / 100
                      }
                      style={{
                        filter: `drop-shadow(0 0 6px ${preset.primary})`,
                        transition: 'stroke-dashoffset 60ms linear',
                      }}
                    />
                  </svg>

                  {/* Outer pulse ripple during scan */}
                  {phase === 'scanning' && (
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0.7 }}
                      animate={{ scale: 1.28, opacity: 0 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.1,
                        ease: 'easeOut',
                      }}
                      className="pointer-events-none absolute inset-0 rounded-full border"
                      style={{ borderColor: preset.primary }}
                    />
                  )}

                  <div className="relative z-10 flex flex-col items-center">
                    <Nfc
                      className="h-9 w-9 transition-transform duration-200 group-hover:scale-110"
                      style={{ color: preset.primary }}
                    />
                    <span className="mt-2 font-mono text-xs font-medium text-slate-200 tabular-nums">
                      {phase === 'scanning'
                        ? `${Math.round(scanProgress)}%`
                        : 'Hold to Scan'}
                    </span>
                  </div>
                </button>

                <div className="mt-4 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                  {[25, 50, 75, 100].map((milestone, idx) => {
                    const reached = scanProgress >= milestone;
                    return (
                      <div key={milestone} className="flex items-center gap-2">
                        {idx > 0 && (
                          <span aria-hidden="true" className="text-slate-700">
                            ·
                          </span>
                        )}
                        <span
                          className="transition-colors duration-150"
                          style={{
                            color: reached ? preset.primary : '#64748B',
                            textShadow: reached
                              ? `0 0 8px rgba(${preset.primaryRgb}, 0.65)`
                              : 'none',
                          }}
                        >
                          {milestone}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-2.5 text-xs text-slate-400">
                  Press and hold the pad above, or tap below for instant NFC verification.
                </p>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onQuickNfcVerify}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-xl font-display text-sm font-semibold text-[#05070c] transition-transform duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    boxShadow: `0 0 24px -4px rgba(${preset.primaryRgb}, 0.55)`,
                  }}
                >
                  Verify NFC Tap
                </button>
              </div>
            )}

            {/* METHOD 4: BLUETOOTH OR WI-FI SCAN */}
            {authMethod === 'ble' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800/90 bg-[#06090F] p-1">
                  <button
                    type="button"
                    onClick={() => setWirelessType('ble')}
                    className={`flex min-h-[38px] items-center justify-center gap-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      wirelessType === 'ble'
                        ? 'bg-[#121926] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    style={
                      wirelessType === 'ble'
                        ? {
                            boxShadow: `inset 0 0 0 1px rgba(${preset.primaryRgb}, 0.5)`,
                          }
                        : undefined
                    }
                  >
                    <Bluetooth
                      className="h-3.5 w-3.5"
                      style={{
                        color: wirelessType === 'ble' ? preset.primary : undefined,
                      }}
                    />
                    <span>Bluetooth Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWirelessType('wifi')}
                    className={`flex min-h-[38px] items-center justify-center gap-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      wirelessType === 'wifi'
                        ? 'bg-[#121926] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    style={
                      wirelessType === 'wifi'
                        ? {
                            boxShadow: `inset 0 0 0 1px rgba(${preset.primaryRgb}, 0.5)`,
                          }
                        : undefined
                    }
                  >
                    <Wifi
                      className="h-3.5 w-3.5"
                      style={{
                        color: wirelessType === 'wifi' ? preset.primary : undefined,
                      }}
                    />
                    <span>Wi-Fi Scan</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/90 bg-[#06090F] px-3.5">
                  {wirelessNodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-medium text-white">
                          {node.title}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400 tabular-nums">
                          {node.meta}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onWirelessPair(node.id)}
                        className="min-h-[36px] shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors hover:bg-white/5 active:scale-95"
                        style={{
                          borderColor: `rgba(${preset.primaryRgb}, 0.5)`,
                          color: preset.primary,
                        }}
                      >
                        Pair & Open
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={isBusy || wirelessScanning}
                  onClick={handleRunQuickWirelessScan}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-semibold text-[#05070c] transition-transform duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    boxShadow: `0 0 24px -4px rgba(${preset.primaryRgb}, 0.55)`,
                  }}
                >
                  <Radio className="h-4 w-4" />
                  <span>
                    {wirelessScanning
                      ? 'Scanning Nearby...'
                      : wirelessType === 'ble'
                      ? 'Scan Bluetooth Devices'
                      : 'Scan Wi-Fi Networks'}
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
