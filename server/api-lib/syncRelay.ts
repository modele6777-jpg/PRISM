import fs from 'fs';
import path from 'path';

// In-memory + temporary server-side storage for zero-config cross-device synchronization
interface VaultEntry {
  data: any;
  updatedAt: number;
}

interface RelayEntry {
  payload: any;
  expiresAt: number;
}

const vaultStore = new Map<string, VaultEntry>();
const relayStore = new Map<string, RelayEntry>();

// Cache directory on disk for local dev persistence
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache', 'prism-sync');
try {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
} catch (_) {}

function getDiskFilePath(uid: string) {
  const safeName = encodeURIComponent(uid).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(cacheDir, `vault_${safeName}.json`);
}

// Purge expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of relayStore.entries()) {
    if (entry.expiresAt < now) {
      relayStore.delete(code);
    }
  }
}, 60000);

export function saveVaultData(uid: string, data: any): { success: boolean; updatedAt: number } {
  if (!uid) return { success: false, updatedAt: 0 };
  const updatedAt = Date.now();
  vaultStore.set(uid, { data, updatedAt });
  try {
    fs.writeFileSync(getDiskFilePath(uid), JSON.stringify({ data, updatedAt }), 'utf8');
  } catch (_) {}
  return { success: true, updatedAt };
}

export function getVaultData(uid: string): { success: boolean; data: any; updatedAt: number } {
  if (!uid) {
    return { success: false, data: null, updatedAt: 0 };
  }
  if (vaultStore.has(uid)) {
    const entry = vaultStore.get(uid)!;
    return { success: true, data: entry.data, updatedAt: entry.updatedAt };
  }
  try {
    const file = getDiskFilePath(uid);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        vaultStore.set(uid, parsed);
        return { success: true, data: parsed.data, updatedAt: parsed.updatedAt || Date.now() };
      }
    }
  } catch (_) {}
  return { success: false, data: null, updatedAt: 0 };
}

export function createRelayCode(payload: any): { code: string; expiresAt: number } {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;
  relayStore.set(code, { payload, expiresAt });
  return { code, expiresAt };
}

export function getRelayData(code: string): { success: boolean; payload: any } {
  const cleanCode = (code || '').trim().replace(/[^0-9]/g, '');
  if (!cleanCode || !relayStore.has(cleanCode)) {
    return { success: false, payload: null };
  }
  const entry = relayStore.get(cleanCode)!;
  if (entry.expiresAt < Date.now()) {
    relayStore.delete(cleanCode);
    return { success: false, payload: null };
  }
  return { success: true, payload: entry.payload };
}
