import fs from 'fs';
import path from 'path';

// In-memory + temporary server-side storage for zero-config cross-device synchronization
interface VaultEntry {
  data: any;
  updatedAt: number;
}

interface RelayEntry {
  payload: any;
  vaultId: string;
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

export function createRelayCode(payload: any, existingVaultId?: string): { code: string; vaultId: string; expiresAt: number } {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const vaultId = (existingVaultId && existingVaultId.trim()) 
    ? existingVaultId.trim() 
    : `pair_${code}_${Date.now().toString(36)}`;
  const expiresAt = Date.now() + 60 * 60 * 1000; // 60 minutes pairing window
  
  relayStore.set(code, { payload, vaultId, expiresAt });
  saveVaultData(vaultId, payload);
  saveVaultData(`pin_${code}`, payload);
  return { code, vaultId, expiresAt };
}

export function getRelayData(code: string): { success: boolean; payload: any; vaultId?: string } {
  const cleanCode = (code || '').trim().replace(/[^0-9]/g, '');
  if (!cleanCode) {
    return { success: false, payload: null };
  }

  if (relayStore.has(cleanCode)) {
    const entry = relayStore.get(cleanCode)!;
    if (entry.expiresAt >= Date.now()) {
      const latestVault = getVaultData(entry.vaultId);
      const effectivePayload = latestVault.success && latestVault.data ? latestVault.data : entry.payload;
      return { success: true, payload: effectivePayload, vaultId: entry.vaultId };
    }
    relayStore.delete(cleanCode);
  }

  // Fallback to disk-persisted pin vault if memory expired or restarted
  const pinVault = getVaultData(`pin_${cleanCode}`);
  if (pinVault.success && pinVault.data) {
    return { success: true, payload: pinVault.data, vaultId: `pin_${cleanCode}` };
  }

  return { success: false, payload: null };
}
