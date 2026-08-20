// ─── Storage Keys ──────────────────────────────────────────

const STORAGE_PREFIX = 'mc_';

function prefixKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

// ─── Local Storage Helpers ─────────────────────────────────

export const storage = {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(prefixKey(key));
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(prefixKey(key), JSON.stringify(value));
    } catch {
      // Storage full or unavailable — fail silently
    }
  },

  remove(key: string): void {
    localStorage.removeItem(prefixKey(key));
  },

  clear(): void {
    // Only clear our prefixed keys
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  },
};

// ─── Well-known storage keys ───────────────────────────────

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  SELECTED_BRANCH_ID: 'selected_branch_id',
  THEME: 'theme',
} as const;
