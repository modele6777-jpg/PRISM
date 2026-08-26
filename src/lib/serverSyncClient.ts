import type { SharedState } from './sharedState';

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function pushToServerVault(uid: string, state: SharedState): Promise<boolean> {
  if (!uid) return false;
  try {
    const res = await fetchWithTimeout('/api/sync/vault/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, payload: state }),
    }, 3500);
    return res.ok;
  } catch (e) {
    console.warn('[ServerVault] push failed:', e);
    return false;
  }
}

export async function pullFromServerVault(uid: string): Promise<SharedState | null> {
  if (!uid) return null;
  try {
    const res = await fetchWithTimeout('/api/sync/vault/pull/' + encodeURIComponent(uid), {}, 3500);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json?.data) {
      return json.data as SharedState;
    }
    return null;
  } catch (e) {
    console.warn('[ServerVault] pull failed:', e);
    return null;
  }
}

export async function generatePairingCode(state: SharedState): Promise<{ code: string; expiresAt: number } | null> {
  try {
    const res = await fetchWithTimeout('/api/sync/relay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: state }),
    }, 4000);
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (e) {
    console.warn('[PairingRelay] generate failed:', e);
    return null;
  }
}

export async function importWithPairingCode(code: string): Promise<SharedState | null> {
  try {
    const res = await fetchWithTimeout('/api/sync/relay/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    }, 4000);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json?.payload) {
      return json.payload as SharedState;
    }
    return null;
  } catch (e) {
    console.warn('[PairingRelay] consume failed:', e);
    return null;
  }
}

