// src/utils/auth/stateStore.ts

export interface OAuthStateRecord {
  codeVerifier: string;
  redirectUri: string;
  provider: string;
  createdAt: number;
}

// Simple in-memory state store (for dev/testing).
// In production you should use Redis or another shared store.
class InMemoryStateStore {
  private map = new Map<string, OAuthStateRecord>();
  private ttlMs = 10 * 60 * 1000; // 10 minutes

  set(state: string, record: OAuthStateRecord) {
    this.map.set(state, record);
    // auto cleanup after TTL
    setTimeout(() => this.map.delete(state), this.ttlMs).unref?.();
  }

  get(state: string) {
    return this.map.get(state);
  }

  delete(state: string) {
    this.map.delete(state);
  }
}

export const stateStore = new InMemoryStateStore();
