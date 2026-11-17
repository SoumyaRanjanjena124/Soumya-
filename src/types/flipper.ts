export type AuthMethod = 'passkey' | 'pin' | 'nfc' | 'ble';

export type LoginPhase =
  | 'booting'
  | 'ready'
  | 'scanning'
  | 'verifying'
  | 'granted'
  | 'denied';

export type NeonPresetId = 'cyber-cyan' | 'flipper-orange' | 'ultraviolet';

export interface NeonPreset {
  id: NeonPresetId;
  label: string;
  primary: string;
  secondary: string;
  primaryRgb: string;
  secondaryRgb: string;
  oledBg: string;
  oledInk: string;
  oledGlow: string;
}

export const NEON_PRESETS: Record<NeonPresetId, NeonPreset> = {
  'cyber-cyan': {
    id: 'cyber-cyan',
    label: 'Cyber Cyan',
    primary: '#00F0FF',
    secondary: '#FF6B00',
    primaryRgb: '0, 240, 255',
    secondaryRgb: '255, 107, 0',
    oledBg: '#061A24',
    oledInk: '#5CF4FF',
    oledGlow: 'rgba(0, 240, 255, 0.35)',
  },
  'flipper-orange': {
    id: 'flipper-orange',
    label: 'Flipper Amber',
    primary: '#FF7A00',
    secondary: '#00F0FF',
    primaryRgb: '255, 122, 0',
    secondaryRgb: '0, 240, 255',
    oledBg: '#1D0F04',
    oledInk: '#FF922E',
    oledGlow: 'rgba(255, 122, 0, 0.38)',
  },
  ultraviolet: {
    id: 'ultraviolet',
    label: 'Ultraviolet',
    primary: '#D946EF',
    secondary: '#22D3EE',
    primaryRgb: '217, 70, 239',
    secondaryRgb: '34, 211, 238',
    oledBg: '#190822',
    oledInk: '#F08CFF',
    oledGlow: 'rgba(217, 70, 239, 0.35)',
  },
};

export type WorkspaceTab = 'subghz' | 'wireless' | 'nfc' | 'gpio' | 'badusb';

export interface BluetoothDeviceRecord {
  id: string;
  name: string;
  address: string;
  rssi: number;
  protocol: string;
  category: 'hardware' | 'wearable' | 'audio';
  angleDeg: number;
  services: string[];
}

export interface WifiNetworkRecord {
  id: string;
  ssid: string;
  bssid: string;
  rssi: number;
  channel: number;
  band: '2.4 GHz' | '5 GHz';
  security: 'WPA3' | 'WPA2' | 'Open';
  angleDeg: number;
  vendor: string;
}

export interface NfcCardRecord {
  id: string;
  name: string;
  protocol: string;
  uid: string;
  frequency: string;
  lastUsed: string;
}

export interface GpioPin {
  number: number;
  label: string;
  voltage: string;
  active: boolean;
  role: 'power' | 'ground' | 'io';
}

export interface BadUsbScript {
  id: string;
  title: string;
  targetOs: string;
  lineCount: number;
  summary: string;
  lines: string[];
}

export type LogCategory = 'sys' | 'auth' | 'wireless' | 'hardware';

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface CyberLogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  detail?: string;
}
