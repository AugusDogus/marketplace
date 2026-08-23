import CookieManager from '@preeternal/react-native-cookie-manager';
import { Platform } from 'react-native';

import { FacebookRequestProfile } from './request-profile';
import { FacebookSession, type FacebookSession as Session } from './session';

const marketplaceUrl = 'https://www.facebook.com/marketplace/';

export type WebAuthError = {
  tag: 'not_authenticated' | 'cookie_store_failed' | 'storage_failed';
  message: string;
};

export type WebAuthResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: WebAuthError };

const webKitStore = (): boolean => Platform.OS === 'ios';

export const FacebookWebAuth = {
  captureSession: async (): Promise<WebAuthResult<Session>> => {
    let nativeCookies: Awaited<ReturnType<typeof CookieManager.get>>;
    try {
      nativeCookies = await CookieManager.get(marketplaceUrl, webKitStore());
    } catch {
      return {
        ok: false,
        error: { tag: 'cookie_store_failed', message: 'The Facebook WebView cookie store could not be read.' },
      };
    }
    const cookies = Object.fromEntries(
      Object.entries(nativeCookies).map(([name, cookie]) => [name, cookie.value]),
    );
    if (cookies.c_user === undefined || cookies.xs === undefined) {
      return {
        ok: false,
        error: { tag: 'not_authenticated', message: 'Facebook has not completed sign-in yet.' },
      };
    }
    const session: Session = {
      marketplaceUrl,
      headers: FacebookRequestProfile.marketplaceDesktop,
      cookies,
    };
    const saved = await FacebookSession.save(session);
    return saved.ok
      ? { ok: true, value: saved.value }
      : { ok: false, error: { tag: 'storage_failed', message: saved.error.message } };
  },
  clear: async (): Promise<WebAuthResult<null>> => {
    const cleared = await FacebookSession.clear();
    if (!cleared.ok) {
      return { ok: false, error: { tag: 'storage_failed', message: cleared.error.message } };
    }
    try {
      await CookieManager.clearAllStores();
      return { ok: true, value: null };
    } catch {
      return {
        ok: false,
        error: {
          tag: 'cookie_store_failed',
          message: 'The app session was removed, but the embedded Facebook login cookies could not be cleared.',
        },
      };
    }
  },
} as const;
