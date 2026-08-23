import * as SecureStore from 'expo-secure-store';

const secureStoreKey = 'facebook-marketplace-session-v1';

export type FacebookSession = {
  marketplaceUrl: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
};

export type SessionError = {
  tag: 'storage_failed';
  message: string;
};

export type SessionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: SessionError };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((item) => typeof item === 'string');

const parseSession = (raw: string): FacebookSession | null => {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      typeof value.marketplaceUrl !== 'string' ||
      !isStringRecord(value.headers) ||
      !isStringRecord(value.cookies)
    ) return null;
    return { marketplaceUrl: value.marketplaceUrl, headers: value.headers, cookies: value.cookies };
  } catch {
    return null;
  }
};

export const FacebookSession = {
  load: async (): Promise<SessionResult<FacebookSession | null>> => {
    try {
      const raw = await SecureStore.getItemAsync(secureStoreKey);
      if (raw === null) return { ok: true, value: null };
      const session = parseSession(raw);
      return session === null
        ? { ok: false, error: { tag: 'storage_failed', message: 'Your saved Facebook sign-in could not be read. Log out, then sign in again.' } }
        : { ok: true, value: session };
    } catch {
      return { ok: false, error: { tag: 'storage_failed', message: 'Your Facebook sign-in could not be loaded. Try again.' } };
    }
  },
  save: async (session: FacebookSession): Promise<SessionResult<FacebookSession>> => {
    try {
      await SecureStore.setItemAsync(secureStoreKey, JSON.stringify(session));
      return { ok: true, value: session };
    } catch {
      return { ok: false, error: { tag: 'storage_failed', message: 'Your Facebook sign-in could not be saved securely. Try again.' } };
    }
  },
  clear: async (): Promise<SessionResult<null>> => {
    try {
      await SecureStore.deleteItemAsync(secureStoreKey);
      return { ok: true, value: null };
    } catch {
      return { ok: false, error: { tag: 'storage_failed', message: 'Facebook could not be logged out. Try again.' } };
    }
  },
  cookieHeader: (session: FacebookSession): string =>
    Object.entries(session.cookies).map(([name, value]) => `${name}=${value}`).join('; '),
  withSetCookies: (session: FacebookSession, setCookies: readonly string[]): FacebookSession => {
    const cookies = { ...session.cookies };
    for (const header of setCookies) {
      const pair = header.split(';', 1)[0];
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (value === '') delete cookies[name];
      else cookies[name] = value;
    }
    return { ...session, cookies };
  },
} as const;
