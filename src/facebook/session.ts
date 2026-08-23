import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const secureStoreKey = 'facebook-marketplace-session-v1';

type HarHeader = { name: string; value: string };
type HarEntry = { request: { url: string; headers: HarHeader[] } };

export type FacebookSession = {
  marketplaceUrl: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
};

export type SessionError = {
  tag: 'cancelled' | 'har_unreadable' | 'har_invalid' | 'har_unauthenticated' | 'storage_failed';
  message: string;
};

export type SessionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: SessionError };

const forwardedHeaders = new Set([
  'accept',
  'accept-language',
  'dpr',
  'referer',
  'sec-ch-prefers-color-scheme',
  'sec-ch-ua',
  'sec-ch-ua-full-version-list',
  'sec-ch-ua-mobile',
  'sec-ch-ua-model',
  'sec-ch-ua-platform',
  'sec-ch-ua-platform-version',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'upgrade-insecure-requests',
  'user-agent',
  'viewport-width',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((item) => typeof item === 'string');

const isHarEntry = (value: unknown): value is HarEntry => {
  if (!isRecord(value) || !isRecord(value.request) || !Array.isArray(value.request.headers)) return false;
  return (
    typeof value.request.url === 'string' &&
    value.request.headers.every(
      (header) => isRecord(header) && typeof header.name === 'string' && typeof header.value === 'string',
    )
  );
};

const recoverMarketplaceEntry = (source: string): HarEntry | null => {
  const marker = source.indexOf('"entries": [');
  if (marker < 0) return null;
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;
  let marketplaceEntry: HarEntry | null = null;

  for (let index = marker + 11; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (character !== '}') continue;
    depth -= 1;
    if (depth !== 0 || start < 0) continue;
    try {
      const parsed: unknown = JSON.parse(source.slice(start, index + 1));
      if (
        isHarEntry(parsed) &&
        parsed.request.url.startsWith('https://www.facebook.com/marketplace') &&
        parsed.request.headers.some((header) => header.name.toLocaleLowerCase() === 'cookie')
      ) marketplaceEntry = parsed;
    } catch {
      return marketplaceEntry;
    }
    start = -1;
  }
  return marketplaceEntry;
};

const parseCookieHeader = (header: string): Record<string, string> =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.includes('='))
      .map((part) => {
        const separator = part.indexOf('=');
        return [part.slice(0, separator), part.slice(separator + 1)];
      }),
  );

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

const sessionFromHar = (source: string): SessionResult<FacebookSession> => {
  const entry = recoverMarketplaceEntry(source);
  if (entry === null || !entry.request.url.startsWith('https://www.facebook.com/marketplace')) {
    return {
      ok: false,
      error: { tag: 'har_invalid', message: 'This file has no recoverable Facebook Marketplace request.' },
    };
  }
  const cookieHeader = entry.request.headers.find((header) => header.name.toLocaleLowerCase() === 'cookie')?.value;
  if (cookieHeader === undefined) {
    return {
      ok: false,
      error: { tag: 'har_unauthenticated', message: 'The Marketplace request has no signed-in Facebook cookies.' },
    };
  }
  const headers = Object.fromEntries(
    entry.request.headers
      .filter((header) => forwardedHeaders.has(header.name.toLocaleLowerCase()))
      .map((header) => [header.name, header.value]),
  );
  return {
    ok: true,
    value: { marketplaceUrl: entry.request.url, headers, cookies: parseCookieHeader(cookieHeader) },
  };
};

export const FacebookSession = {
  load: async (): Promise<SessionResult<FacebookSession | null>> => {
    try {
      const raw = await SecureStore.getItemAsync(secureStoreKey);
      if (raw === null) return { ok: true, value: null };
      const session = parseSession(raw);
      return session === null
        ? { ok: false, error: { tag: 'storage_failed', message: 'The saved Facebook session is unreadable. Log out, then import the HAR again.' } }
        : { ok: true, value: session };
    } catch {
      return { ok: false, error: { tag: 'storage_failed', message: 'The Facebook session could not be read from secure device storage.' } };
    }
  },
  save: async (session: FacebookSession): Promise<SessionResult<FacebookSession>> => {
    try {
      await SecureStore.setItemAsync(secureStoreKey, JSON.stringify(session));
      return { ok: true, value: session };
    } catch {
      return { ok: false, error: { tag: 'storage_failed', message: 'The Facebook session could not be saved securely on this device.' } };
    }
  },
  importHar: async (): Promise<SessionResult<FacebookSession>> => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/octet-stream', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) {
      return { ok: false, error: { tag: 'cancelled', message: 'No HAR was selected. The existing session is unchanged.' } };
    }
    let source: string;
    try {
      source = await readAsStringAsync(picked.assets[0].uri);
    } catch {
      return { ok: false, error: { tag: 'har_unreadable', message: 'The selected HAR could not be read. Choose the original exported file.' } };
    }
    const parsed = sessionFromHar(source);
    if (!parsed.ok) return parsed;
    return FacebookSession.save(parsed.value);
  },
  clear: async (): Promise<SessionResult<null>> => {
    try {
      await SecureStore.deleteItemAsync(secureStoreKey);
      return { ok: true, value: null };
    } catch {
      return { ok: false, error: { tag: 'storage_failed', message: 'The local Facebook session could not be removed from secure storage.' } };
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
