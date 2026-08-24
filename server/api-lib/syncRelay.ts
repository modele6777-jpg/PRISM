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
  return { success: true, updatedAt };
}

export function getVaultData(uid: string): { success: boolean; data: any; updatedAt: number } {
  if (!uid || !vaultStore.has(uid)) {
    return { success: false, data: null, updatedAt: 0 };
  }
  const entry = vaultStore.get(uid)!;
  return { success: true, data: entry.data, updatedAt: entry.updatedAt };
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
