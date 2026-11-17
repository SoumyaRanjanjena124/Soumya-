import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { CompanionWorkspace } from './components/CompanionWorkspace';
import { CyberLogConsole } from './components/CyberLogConsole';
import {
  FlipperHardwareTwin,
  PadDirection,
} from './components/FlipperHardwareTwin';
import { LoginPanel } from './components/LoginPanel';
import { NeonBackdrop } from './components/NeonBackdrop';
import {
  AuthMethod,
  CyberLogEntry,
  LogCategory,
  LogLevel,
  LoginPhase,
  NEON_PRESETS,
  NeonPresetId,
  WorkspaceTab,
} from './types/flipper';
import { cyberAudio } from './utils/audioFeedback';

function formatLogTime(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

const DEMO_PIN = '2486';

export default function App() {
  const [presetId, setPresetId] = useState<NeonPresetId>('cyber-cyan');
  const [phase, setPhase] = useState<LoginPhase>('booting');
  const [unlocked, setUnlocked] = useState(false);

  const [authMethod, setAuthMethod] = useState<AuthMethod>('passkey');
  const [operatorId, setOperatorId] = useState('fz-zero-042');
  const [passkey, setPasskey] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPadPressed, setLastPadPressed] = useState<PadDirection | null>(
    null
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [initialWorkspaceTab, setInitialWorkspaceTab] =
    useState<WorkspaceTab>('subghz');
  const [logs, setLogs] = useState<CyberLogEntry[]>(() => [
    {
      id: 'boot-init',
      timestamp: formatLogTime(),
      category: 'sys',
      level: 'info',
      message: 'CyberDeck bootloader started',
      detail: 'FZ-CYBER REV 2',
    },
  ]);

  const scanTimerRef = useRef<number | null>(null);
  const scanProgressRef = useRef(0);
  const lastNfcMilestoneRef = useRef(0);
  const bootKeyRef = useRef(0);
  const logSeqRef = useRef(1);
  const [bootSequenceKey, setBootSequenceKey] = useState(0);

  const preset = NEON_PRESETS[presetId];

  const appendLog = useCallback(
    (
      category: LogCategory,
      level: LogLevel,
      message: string,
      detail?: string
    ) => {
      logSeqRef.current += 1;
      const entry: CyberLogEntry = {
        id: `log-${Date.now()}-${logSeqRef.current}`,
        timestamp: formatLogTime(),
        category,
        level,
        message,
        detail,
      };
      setLogs((prev) => [...prev.slice(-79), entry]);
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Boot animation progression
  useEffect(() => {
    if (phase !== 'booting') return;
    const timer = window.setTimeout(() => {
      setPhase('ready');
      appendLog('sys', 'success', 'Hardware companion ready', 'Awaiting operator auth');
    }, 1050);
    return () => window.clearTimeout(timer);
  }, [phase, bootSequenceKey, appendLog]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      cyberAudio.setEnabled(next);
      if (next) {
        cyberAudio.playPinKeyBeep('5');
      }
      appendLog('sys', 'info', next ? 'Audio feedback enabled' : 'Audio feedback muted');
      return next;
    });
  }, [appendLog]);

  const triggerVerificationSuccess = useCallback(
    (methodLabel?: string) => {
      setErrorMessage(null);
      setPhase('verifying');
      appendLog(
        'auth',
        'info',
        'Cryptographic key verification started',
        methodLabel
      );
      window.setTimeout(() => {
        cyberAudio.playAuthResult('granted');
        setPhase('granted');
        appendLog('auth', 'success', 'Access granted · device unlocked', operatorId || 'fz-zero-042');
        window.setTimeout(() => {
          setUnlocked(true);
        }, 950);
      }, 1350);
    },
    [appendLog, operatorId]
  );

  const triggerVerificationFailure = useCallback(
    (message: string) => {
      cyberAudio.playAuthResult('denied');
      setPhase('denied');
      setErrorMessage(message);
      appendLog('auth', 'error', 'Authentication failed', message);
      window.setTimeout(() => {
        setPhase('ready');
      }, 650);
    },
    [appendLog]
  );

  const handleSubmitPasskey = (e: FormEvent) => {
    e.preventDefault();
    if (!operatorId.trim() || !passkey.trim()) {
      triggerVerificationFailure(
        'Enter both device serial and passkey, or click Fill Demo Key.'
      );
      return;
    }
    triggerVerificationSuccess('Passkey handshake');
  };

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (phase === 'verifying' || phase === 'granted') return;
      setErrorMessage(null);
      if (pinValue.length < 4) {
        cyberAudio.playPinKeyBeep(digit);
        appendLog(
          'auth',
          'info',
          'PIN code digit entered',
          `Slot ${pinValue.length + 1} of 4`
        );
      }
      setPinValue((prev) => (prev.length < 4 ? prev + digit : prev));
    },
    [phase, pinValue.length, appendLog]
  );

  const handlePinBackspace = useCallback(() => {
    setErrorMessage(null);
    if (pinValue.length > 0) {
      cyberAudio.playPinActionBeep('backspace');
      appendLog('auth', 'info', 'PIN code digit removed');
    }
    setPinValue((prev) => prev.slice(0, -1));
  }, [pinValue.length, appendLog]);

  const handlePinClear = useCallback(() => {
    setErrorMessage(null);
    if (pinValue.length > 0) {
      cyberAudio.playPinActionBeep('clear');
      appendLog('auth', 'warn', 'PIN code cleared');
    }
    setPinValue('');
  }, [pinValue.length, appendLog]);

  const handleSubmitPin = useCallback(() => {
    if (pinValue.length < 4) {
      triggerVerificationFailure('Enter all 4 PIN digits to unlock.');
      return;
    }
    if (pinValue !== DEMO_PIN) {
      setPinValue('');
      triggerVerificationFailure('Incorrect PIN. Use 2486 for demo access.');
      return;
    }
    appendLog('auth', 'success', 'PIN code verified');
    triggerVerificationSuccess('Device PIN');
  }, [pinValue, triggerVerificationFailure, triggerVerificationSuccess, appendLog]);

  // Keyboard support for PIN entry
  useEffect(() => {
    if (unlocked || authMethod !== 'pin') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Enter' && pinValue.length === 4) {
        handleSubmitPin();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    unlocked,
    authMethod,
    handlePinDigit,
    handlePinBackspace,
    handleSubmitPin,
    pinValue.length,
  ]);

  // NFC Hold-to-Scan progression with milestone audio cues
  const stopNfcScan = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
      if (scanProgressRef.current < 100) {
        appendLog('auth', 'warn', 'NFC scan interrupted', `Reached ${Math.round(scanProgressRef.current)}%`);
      }
    }
    lastNfcMilestoneRef.current = 0;
    scanProgressRef.current = 0;
    setPhase((curr) => (curr === 'scanning' ? 'ready' : curr));
    setScanProgress((curr) => (curr >= 100 ? curr : 0));
  }, [appendLog]);

  const startNfcScan = useCallback(() => {
    if (phase === 'verifying' || phase === 'granted') return;
    setErrorMessage(null);
    setPhase('scanning');
    scanProgressRef.current = 8;
    lastNfcMilestoneRef.current = 0;
    setScanProgress(8);
    appendLog('auth', 'info', 'NFC field scan initiated');

    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
    }

    scanTimerRef.current = window.setInterval(() => {
      const next = Math.min(scanProgressRef.current + 6, 100);
      scanProgressRef.current = next;
      setScanProgress(next);

      const milestones: (25 | 50 | 75 | 100)[] = [25, 50, 75, 100];
      for (const m of milestones) {
        if (next >= m && lastNfcMilestoneRef.current < m) {
          lastNfcMilestoneRef.current = m;
          cyberAudio.playNfcMilestoneBeep(m);
          appendLog('auth', m === 100 ? 'success' : 'info', `NFC scan milestone ${m}%`);
        }
      }

      if (next >= 100) {
        if (scanTimerRef.current !== null) {
          window.clearInterval(scanTimerRef.current);
          scanTimerRef.current = null;
        }
        triggerVerificationSuccess('NFC hardware key');
      }
    }, 55);
  }, [phase, triggerVerificationSuccess, appendLog]);

  const handleQuickNfcVerify = useCallback(() => {
    if (phase === 'verifying' || phase === 'granted') return;
    setErrorMessage(null);
    setPhase('scanning');
    scanProgressRef.current = 50;
    lastNfcMilestoneRef.current = 50;
    setScanProgress(50);
    cyberAudio.playNfcMilestoneBeep(50);
    appendLog('auth', 'info', 'NFC quick tap initiated');

    window.setTimeout(() => {
      scanProgressRef.current = 100;
      lastNfcMilestoneRef.current = 100;
      setScanProgress(100);
      cyberAudio.playNfcMilestoneBeep(100);
      appendLog('auth', 'success', 'NFC scan milestone 100%');
      window.setTimeout(() => {
        triggerVerificationSuccess('NFC quick tap');
      }, 220);
    }, 180);
  }, [phase, triggerVerificationSuccess, appendLog]);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
      }
    };
  }, []);

  // Interactive Flipper Hardware Twin D-Pad handler
  const handlePadPress = (dir: PadDirection) => {
    setLastPadPressed(dir);
    window.setTimeout(() => {
      setLastPadPressed((curr) => (curr === dir ? null : curr));
    }, 220);
    appendLog('hardware', 'info', `Hardware D-Pad pressed: ${dir.toUpperCase()}`);

    if (authMethod === 'pin') {
      if (dir === 'up') handlePinDigit('2');
      else if (dir === 'right') handlePinDigit('4');
      else if (dir === 'down') handlePinDigit('8');
      else if (dir === 'left') handlePinDigit('6');
      else if (dir === 'back') handlePinBackspace();
      else if (dir === 'ok') handleSubmitPin();
      return;
    }

    const order: AuthMethod[] = ['passkey', 'pin', 'nfc', 'ble'];
    const idx = order.indexOf(authMethod);
    if (dir === 'left') {
      const next = order[(idx + order.length - 1) % order.length];
      setAuthMethod(next);
      setErrorMessage(null);
      appendLog('auth', 'info', `Auth mode switched to ${next.toUpperCase()}`);
    } else if (dir === 'right') {
      const next = order[(idx + 1) % order.length];
      setAuthMethod(next);
      setErrorMessage(null);
      appendLog('auth', 'info', `Auth mode switched to ${next.toUpperCase()}`);
    } else if (dir === 'ok') {
      if (authMethod === 'nfc') {
        handleQuickNfcVerify();
      } else if (authMethod === 'ble') {
        setInitialWorkspaceTab('wireless');
        triggerVerificationSuccess('Wireless bridge pair');
      } else if (authMethod === 'passkey') {
        if (!passkey.trim()) {
          setOperatorId('fz-zero-042');
          setPasskey('cyber-dolphin-433');
        }
        setInitialWorkspaceTab('subghz');
        triggerVerificationSuccess('Hardware OK passkey');
      }
    } else if (dir === 'back') {
      setErrorMessage(null);
    }
  };

  const handleWirelessPair = (deviceLabel: string) => {
    setOperatorId(deviceLabel);
    setInitialWorkspaceTab('wireless');
    appendLog('wireless', 'success', 'Wireless node selected for pairing', deviceLabel);
    triggerVerificationSuccess(`Wireless pair (${deviceLabel})`);
  };

  const handleReplayBoot = () => {
    setErrorMessage(null);
    setScanProgress(0);
    setPinValue('');
    bootKeyRef.current += 1;
    setBootSequenceKey(bootKeyRef.current);
    setPhase('booting');
    appendLog('sys', 'info', 'Boot animation replayed');
  };

  const handleLockDevice = () => {
    setUnlocked(false);
    setPasskey('');
    setPinValue('');
    setScanProgress(0);
    setErrorMessage(null);
    bootKeyRef.current += 1;
    setBootSequenceKey(bootKeyRef.current);
    setPhase('booting');
    appendLog('auth', 'warn', 'Device locked · session terminated');
  };

  return (
    <div className="relative min-h-screen w-full text-slate-100 selection:bg-cyan-400/30 selection:text-white">
      <NeonBackdrop preset={preset} phase={unlocked ? 'granted' : phase} />

      <AnimatePresence mode="wait">
        {unlocked ? (
          <CompanionWorkspace
            key="workspace"
            preset={preset}
            operatorId={operatorId}
            onLockDevice={handleLockDevice}
            initialTab={initialWorkspaceTab}
            logs={logs}
            onClearLogs={clearLogs}
            onLog={appendLog}
          />
        ) : (
          <motion.div
            key={`login-screen-${bootSequenceKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-4 py-6 sm:px-8"
          >
            {/* Clean 3-Zone Top Navigation Bar */}
            <header className="flex flex-wrap items-center justify-between gap-4 sm:gap-8">
              <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
                SOUMYA Flipper Zero
              </span>

              {/* Neon Lighting Profile Selector */}
              <div
                role="group"
                aria-label="Neon lighting preset"
                className="flex items-center gap-1 rounded-xl border border-slate-800/90 bg-[#0B0F17]/80 p-1 backdrop-blur-md"
              >
                {(Object.keys(NEON_PRESETS) as NeonPresetId[]).map((id) => {
                  const item = NEON_PRESETS[id];
                  const active = id === presetId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setPresetId(id);
                        appendLog('sys', 'info', `Neon profile switched to ${item.label}`);
                      }}
                      className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                        active
                          ? 'bg-[#151D2B] text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      style={
                        active
                          ? {
                              boxShadow: `inset 0 0 0 1px rgba(${item.primaryRgb}, 0.55), 0 0 14px -4px rgba(${item.primaryRgb}, 0.45)`,
                            }
                          : undefined
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleReplayBoot}
                className="flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-800 bg-[#0B0F17]/85 px-4 py-2 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 backdrop-blur-md transition-colors hover:border-slate-600 hover:text-white active:scale-95 focus-visible:outline-2"
              >
                <RotateCcw
                  className="h-3.5 w-3.5"
                  style={{ color: preset.primary }}
                />
                <span>Replay Boot</span>
              </button>
            </header>

            {/* Primary Dual-Column Cyberpunk Login Stage */}
            <main className="my-8 grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Column: Hardware Twin & Neon Showcase */}
              <div className="flex flex-col items-center lg:col-span-6 lg:items-start">
                <div className="mb-6 max-w-md text-center lg:text-left">
                  <p className="font-mono text-xs text-slate-400">
                    CyberDeck OS · Wireless Hardware Companion
                  </p>
                  <h2
                    className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
                    style={{ textWrap: 'balance' }}
                  >
                    Tactile security, lit in neon.
                  </h2>
                </div>

                <div className="w-full">
                  <FlipperHardwareTwin
                    preset={preset}
                    phase={phase}
                    authMethod={authMethod}
                    pinValue={pinValue}
                    scanProgress={scanProgress}
                    operatorName={operatorId}
                    onPadPress={handlePadPress}
                    lastPadPressed={lastPadPressed}
                  />
                </div>
              </div>

              {/* Right Column: Interactive Login Panel */}
              <div className="flex justify-center lg:col-span-6 lg:justify-end">
                <LoginPanel
                  preset={preset}
                  phase={phase}
                  authMethod={authMethod}
                  onSelectMethod={(m) => {
                    setAuthMethod(m);
                    setErrorMessage(null);
                    appendLog('auth', 'info', `Auth tab selected: ${m.toUpperCase()}`);
                  }}
                  operatorId={operatorId}
                  onOperatorIdChange={setOperatorId}
                  passkey={passkey}
                  onPasskeyChange={setPasskey}
                  pinValue={pinValue}
                  onPinDigit={handlePinDigit}
                  onPinBackspace={handlePinBackspace}
                  onPinClear={handlePinClear}
                  onSubmitPasskey={handleSubmitPasskey}
                  onSubmitPin={handleSubmitPin}
                  onStartNfcScan={startNfcScan}
                  onStopNfcScan={stopNfcScan}
                  onQuickNfcVerify={handleQuickNfcVerify}
                  scanProgress={scanProgress}
                  errorMessage={errorMessage}
                  soundEnabled={soundEnabled}
                  onToggleSound={handleToggleSound}
                  onWirelessPair={handleWirelessPair}
                  onLog={appendLog}
                />
              </div>
            </main>

            {/* Scrollable Terminal-Style Activity Log */}
            <div className="mb-6">
              <CyberLogConsole
                preset={preset}
                logs={logs}
                onClear={clearLogs}
              />
            </div>

            {/* Quiet Minimal Footer */}
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-900/90 pt-4 text-xs text-slate-500">
              <span>SOUMYA Flipper Zero</span>
              <span className="font-mono tabular-nums">
                Demo PIN 2486 · Or tap NFC / Fill Demo Key
              </span>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
