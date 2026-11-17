import { motion } from 'motion/react';
import {
  AuthMethod,
  LoginPhase,
  NeonPreset,
} from '../types/flipper';

export type PadDirection = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back';

interface FlipperHardwareTwinProps {
  preset: NeonPreset;
  phase: LoginPhase;
  authMethod: AuthMethod;
  pinValue: string;
  scanProgress: number;
  operatorName: string;
  onPadPress: (dir: PadDirection) => void;
  lastPadPressed: PadDirection | null;
}

function PixelDolphin({
  phase,
  inkColor,
}: {
  phase: LoginPhase;
  inkColor: string;
}) {
  // Crisp 24x14 pixel grid dolphin silhouette with reactive expression
  const eyeOffsetY = phase === 'granted' ? 4 : 5;
  return (
    <svg
      viewBox="0 0 28 18"
      className="pixel-art h-11 w-16 shrink-0"
      aria-hidden="true"
    >
      {/* Tail fin */}
      <rect x="2" y="10" width="2" height="2" fill={inkColor} />
      <rect x="1" y="12" width="2" height="2" fill={inkColor} />
      <rect x="4" y="11" width="2" height="3" fill={inkColor} />
      {/* Body */}
      <rect x="5" y="7" width="3" height="5" fill={inkColor} />
      <rect x="8" y="5" width="4" height="7" fill={inkColor} />
      <rect x="12" y="4" width="6" height="8" fill={inkColor} />
      <rect x="18" y="5" width="4" height="6" fill={inkColor} />
      {/* Dorsal fin */}
      <rect x="11" y="2" width="2" height="2" fill={inkColor} />
      <rect x="12" y="1" width="2" height="1" fill={inkColor} />
      <rect x="13" y="2" width="2" height="2" fill={inkColor} />
      {/* Rostrum / Nose */}
      <rect x="22" y="8" width="4" height="2" fill={inkColor} />
      <rect x="25" y="9" width="2" height="1" fill={inkColor} />
      {/* Belly cutout */}
      <rect x="10" y="10" width="9" height="2" fill="#04080d" opacity="0.65" />
      {/* Eye */}
      {phase === 'denied' ? (
        <>
          <rect x="19" y="6" width="1" height="1" fill="#04080d" />
          <rect x="21" y="6" width="1" height="1" fill="#04080d" />
          <rect x="20" y="7" width="1" height="1" fill="#04080d" />
        </>
      ) : phase === 'granted' ? (
        <>
          <rect x="19" y={eyeOffsetY} width="2" height="1" fill="#04080d" />
          <rect x="18" y={eyeOffsetY + 1} width="1" height="1" fill="#04080d" />
          <rect x="21" y={eyeOffsetY + 1} width="1" height="1" fill="#04080d" />
        </>
      ) : (
        <rect x="19" y={eyeOffsetY} width="2" height="2" fill="#04080d" />
      )}
      {/* Signal waves when scanning or verifying */}
      {(phase === 'scanning' || phase === 'verifying') && (
        <>
          <rect x="24" y="4" width="1" height="2" fill={inkColor} opacity="0.85" />
          <rect x="26" y="2" width="1" height="4" fill={inkColor} opacity="0.55" />
        </>
      )}
    </svg>
  );
}

export function FlipperHardwareTwin({
  preset,
  phase,
  authMethod,
  pinValue,
  scanProgress,
  operatorName,
  onPadPress,
  lastPadPressed,
}: FlipperHardwareTwinProps) {
  const activeColor = phase === 'denied' ? '#FF445A' : preset.primary;
  const activeRgb = phase === 'denied' ? '255, 68, 90' : preset.primaryRgb;

  const getOledHeadline = () => {
    if (phase === 'booting') return 'Booting Kernel';
    if (phase === 'scanning') {
      return authMethod === 'ble' ? 'Wireless Sweep' : 'Reading NFC Field';
    }
    if (phase === 'verifying') return 'Verifying Key';
    if (phase === 'granted') return 'Device Unlocked';
    if (phase === 'denied') return 'Access Denied';
    if (authMethod === 'pin') return 'Enter 4-Digit PIN';
    if (authMethod === 'nfc') return 'Tap Keycard';
    if (authMethod === 'ble') return 'BLE / Wi-Fi Scan';
    return 'Awaiting Pairing';
  };

  const getOledSubline = () => {
    if (phase === 'booting') return 'Loading Sub-GHz & NFC';
    if (phase === 'scanning') {
      return authMethod === 'ble'
        ? 'Sweeping 2.4 & 5 GHz'
        : `Signal lock ${Math.round(scanProgress)}%`;
    }
    if (phase === 'verifying') return 'AES-256 handshake';
    if (phase === 'granted') return `Operator ${operatorName || 'Zero'}`;
    if (phase === 'denied') return 'Invalid credential';
    if (authMethod === 'pin') return 'Use D-Pad or keypad';
    if (authMethod === 'nfc') return 'Hold pad to scan';
    if (authMethod === 'ble') return 'Select node to pair';
    return '433.92 MHz ready';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        x: phase === 'denied' ? [0, -8, 8, -5, 5, 0] : 0,
      }}
      transition={{
        duration: phase === 'denied' ? 0.36 : 0.65,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative flex flex-col items-center select-none"
    >
      {/* Ambient Neon Floor Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-[44px] opacity-60 blur-2xl transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 50% 45%, rgba(${activeRgb}, 0.28), rgba(${preset.secondaryRgb}, 0.08) 55%, transparent 78%)`,
        }}
      />

      {/* Hardware Body Shell */}
      <div
        className="relative w-full max-w-[420px] rounded-[30px] border bg-[#0B0F17]/95 p-5 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:p-6"
        style={{
          borderColor: `rgba(${activeRgb}, 0.42)`,
          boxShadow: `0 0 42px -10px rgba(${activeRgb}, 0.36), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        {/* Animated Neon Edge Trace Bar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[2px] overflow-hidden rounded-full"
        >
          <div
            className="animate-neon-sweep h-full w-1/2"
            style={{
              background: `linear-gradient(90deg, transparent, ${activeColor}, ${preset.secondary}, transparent)`,
            }}
          />
        </div>

        {/* Top Hardware Bezel Details: IR Blaster & Wrist Lanyard Slot */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            {/* Smoked IR Window */}
            <div
              className="h-2.5 w-10 rounded-full border border-white/10 bg-[#05070b]"
              style={{
                boxShadow:
                  phase === 'scanning' || phase === 'verifying'
                    ? `0 0 10px ${activeColor}`
                    : 'none',
              }}
            />
            <span className="font-mono text-[11px] tracking-wider text-slate-400">
              FZ-CYBER · REV 2
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 tabular-nums">
            <span>98%</span>
            <span aria-hidden="true">·</span>
            <span>BLE 5.2</span>
          </div>
        </div>

        {/* Backlit OLED Screen Bezel */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#04070c] p-2.5 shadow-inner">
          <div
            className="relative h-[168px] w-full overflow-hidden rounded-xl border transition-colors duration-500"
            style={{
              backgroundColor:
                phase === 'denied' ? '#1E080D' : preset.oledBg,
              borderColor: `rgba(${activeRgb}, 0.55)`,
              boxShadow: `inset 0 0 28px rgba(${activeRgb}, 0.18)`,
            }}
          >
            {/* Scanline overlay */}
            <div
              aria-hidden="true"
              className="oled-scanlines pointer-events-none absolute inset-0 z-10 opacity-50"
            />

            {/* Laser verification sweep */}
            {(phase === 'scanning' || phase === 'verifying') && (
              <div
                aria-hidden="true"
                className="animate-scan-vertical pointer-events-none absolute inset-x-0 top-0 z-20 h-9"
                style={{
                  background: `linear-gradient(180deg, transparent, rgba(${activeRgb}, 0.35), transparent)`,
                }}
              />
            )}

            {/* OLED Top Bar */}
            <div
              className="relative z-10 flex items-center justify-between border-b px-3.5 py-2 font-mono text-[11px]"
              style={{
                borderColor: `rgba(${activeRgb}, 0.25)`,
                color: phase === 'denied' ? '#FF7588' : preset.oledInk,
              }}
            >
              <span>{authMethod === 'pin' ? 'PIN AUTH' : authMethod === 'nfc' ? 'NFC READER' : 'CYBERLINK'}</span>
              <span className="tabular-nums">
                {phase === 'granted'
                  ? 'UNLOCKED'
                  : phase === 'verifying'
                  ? 'SYNCING'
                  : '433.92 MHz'}
              </span>
            </div>

            {/* OLED Main Content Area */}
            <div className="relative z-10 flex h-[126px] items-center justify-between gap-4 px-4">
              <div className="flex min-w-0 flex-col justify-center">
                <p
                  className="font-display text-lg font-semibold tracking-tight transition-colors"
                  style={{
                    color: phase === 'denied' ? '#FF8A99' : preset.oledInk,
                    textShadow: `0 0 12px ${preset.oledGlow}`,
                  }}
                >
                  {getOledHeadline()}
                </p>
                <p
                  className="mt-0.5 font-mono text-xs opacity-80"
                  style={{
                    color: phase === 'denied' ? '#FF8A99' : preset.oledInk,
                  }}
                >
                  {getOledSubline()}
                </p>

                {/* Contextual visual readout inside OLED */}
                {authMethod === 'pin' && phase !== 'booting' && phase !== 'granted' ? (
                  <div className="mt-3 flex items-center gap-2">
                    {[0, 1, 2, 3].map((idx) => {
                      const filled = idx < pinValue.length;
                      return (
                        <div
                          key={idx}
                          className="flex h-6 w-6 items-center justify-center rounded border font-mono text-xs font-semibold tabular-nums transition-all duration-150"
                          style={{
                            borderColor: filled
                              ? activeColor
                              : `rgba(${activeRgb}, 0.32)`,
                            backgroundColor: filled
                              ? `rgba(${activeRgb}, 0.22)`
                              : 'transparent',
                            color: preset.oledInk,
                            boxShadow: filled
                              ? `0 0 10px rgba(${activeRgb}, 0.4)`
                              : 'none',
                          }}
                        >
                          {filled ? pinValue[idx] : '·'}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 w-36 overflow-hidden rounded-full bg-black/40 p-[2px]">
                    <motion.div
                      className="h-1.5 rounded-full"
                      style={{
                        backgroundColor: activeColor,
                        boxShadow: `0 0 8px ${activeColor}`,
                      }}
                      initial={{ width: '15%' }}
                      animate={{
                        width:
                          phase === 'booting'
                            ? '65%'
                            : phase === 'scanning'
                            ? `${Math.max(12, scanProgress)}%`
                            : phase === 'verifying'
                            ? '88%'
                            : phase === 'granted'
                            ? '100%'
                            : phase === 'denied'
                            ? '25%'
                            : '42%',
                      }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                )}
              </div>

              <motion.div
                animate={{
                  y:
                    phase === 'granted'
                      ? [0, -6, 0, -4, 0]
                      : phase === 'booting'
                      ? [2, 0]
                      : [0, -2, 0],
                }}
                transition={{
                  repeat: phase === 'granted' ? 0 : Infinity,
                  duration: phase === 'granted' ? 0.55 : 2.8,
                  ease: 'easeInOut',
                }}
              >
                <PixelDolphin
                  phase={phase}
                  inkColor={phase === 'denied' ? '#FF7588' : preset.oledInk}
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Lower Physical Hardware Controls: Interactive D-Pad + Back Button */}
        <div className="mt-6 flex items-center justify-between gap-4 px-2">
          {/* Interactive Tactile D-Pad */}
          <div
            className="relative grid h-36 w-36 grid-cols-3 grid-rows-3 gap-1.5 rounded-full border border-slate-800/90 bg-[#080b11] p-2.5 shadow-inner"
            role="group"
            aria-label="Flipper hardware D-pad controls"
          >
            <div />
            <button
              type="button"
              onClick={() => onPadPress('up')}
              aria-label="D-Pad Up"
              className="flex min-h-[38px] items-center justify-center rounded-lg border border-slate-800 bg-[#111724] text-slate-300 transition-all duration-150 hover:border-slate-600 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor:
                  lastPadPressed === 'up' ? activeColor : undefined,
                boxShadow:
                  lastPadPressed === 'up'
                    ? `0 0 12px rgba(${activeRgb}, 0.5)`
                    : undefined,
              }}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M8 4l5 6H3l5-6z" />
              </svg>
            </button>
            <div />

            <button
              type="button"
              onClick={() => onPadPress('left')}
              aria-label="D-Pad Left"
              className="flex min-h-[38px] items-center justify-center rounded-lg border border-slate-800 bg-[#111724] text-slate-300 transition-all duration-150 hover:border-slate-600 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor:
                  lastPadPressed === 'left' ? activeColor : undefined,
                boxShadow:
                  lastPadPressed === 'left'
                    ? `0 0 12px rgba(${activeRgb}, 0.5)`
                    : undefined,
              }}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M4 8l6-5v10L4 8z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onPadPress('ok')}
              aria-label="D-Pad Center OK"
              className="flex min-h-[38px] items-center justify-center rounded-full border font-mono text-[11px] font-semibold text-white transition-all duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: activeColor,
                backgroundColor: `rgba(${activeRgb}, 0.18)`,
                boxShadow:
                  lastPadPressed === 'ok'
                    ? `0 0 18px rgba(${activeRgb}, 0.75)`
                    : `0 0 10px rgba(${activeRgb}, 0.25)`,
              }}
            >
              OK
            </button>

            <button
              type="button"
              onClick={() => onPadPress('right')}
              aria-label="D-Pad Right"
              className="flex min-h-[38px] items-center justify-center rounded-lg border border-slate-800 bg-[#111724] text-slate-300 transition-all duration-150 hover:border-slate-600 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor:
                  lastPadPressed === 'right' ? activeColor : undefined,
                boxShadow:
                  lastPadPressed === 'right'
                    ? `0 0 12px rgba(${activeRgb}, 0.5)`
                    : undefined,
              }}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M12 8l-6 5V3l6 5z" />
              </svg>
            </button>

            <div />
            <button
              type="button"
              onClick={() => onPadPress('down')}
              aria-label="D-Pad Down"
              className="flex min-h-[38px] items-center justify-center rounded-lg border border-slate-800 bg-[#111724] text-slate-300 transition-all duration-150 hover:border-slate-600 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor:
                  lastPadPressed === 'down' ? activeColor : undefined,
                boxShadow:
                  lastPadPressed === 'down'
                    ? `0 0 12px rgba(${activeRgb}, 0.5)`
                    : undefined,
              }}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M8 12l-5-6h10l-5 6z" />
              </svg>
            </button>
            <div />
          </div>

          {/* Right Hardware Column: Speaker Grille + Back / Reset Button */}
          <div className="flex flex-1 flex-col items-end justify-between gap-5 py-1">
            {/* Precision Machined Speaker Vent Dots */}
            <div
              aria-hidden="true"
              className="grid grid-cols-5 gap-1.5 opacity-60"
            >
              {Array.from({ length: 15 }).map((_, i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full bg-slate-600"
                />
              ))}
            </div>

            <div className="text-right">
              <p className="font-mono text-[11px] text-slate-400">
                {authMethod === 'pin'
                  ? 'D-Pad enters digits'
                  : 'OK triggers auth'}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                Up 2 · Right 4 · Down 8 · Left 6
              </p>
            </div>

            <button
              type="button"
              onClick={() => onPadPress('back')}
              aria-label="Hardware Back Button"
              className="flex min-h-[44px] items-center gap-2 rounded-full border border-slate-700/80 bg-[#121826] px-4 py-2 font-mono text-xs font-medium text-slate-200 transition-all duration-150 hover:border-slate-500 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor:
                  lastPadPressed === 'back' ? preset.secondary : undefined,
                boxShadow:
                  lastPadPressed === 'back'
                    ? `0 0 14px rgba(${preset.secondaryRgb}, 0.45)`
                    : undefined,
              }}
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M9.5 4.5L5 8l4.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5.5 8h6" strokeLinecap="round" />
              </svg>
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
