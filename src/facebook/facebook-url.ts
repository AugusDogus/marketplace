const facebookHosts = new Set(['facebook.com', 'm.facebook.com', 'www.facebook.com']);

const parseFacebookUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && facebookHosts.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
};

export const FacebookUrl = {
  isCheckpoint: (value: string, body: string): boolean => {
    const url = parseFacebookUrl(value);
    if (url === null) return false;
    return url.pathname.startsWith('/checkpoint/') || body.includes('We suspect automated behavior on your account');
  },
  isMarketplace: (value: string): boolean => {
    const url = parseFacebookUrl(value);
    return url !== null && (url.pathname === '/marketplace' || url.pathname.startsWith('/marketplace/'));
  },
} as const;
