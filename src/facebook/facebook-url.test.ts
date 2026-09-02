import { describe, expect, test } from 'bun:test';

import { FacebookUrl } from './facebook-url';

describe('FacebookUrl', () => {
  test('accepts Marketplace pages only after Facebook navigation completes', () => {
    expect(FacebookUrl.isMarketplace('https://www.facebook.com/marketplace/')).toBe(true);
    expect(FacebookUrl.isMarketplace('https://m.facebook.com/marketplace/search/')).toBe(true);
    expect(FacebookUrl.isMarketplace('https://www.facebook.com/login/')).toBe(false);
    expect(FacebookUrl.isMarketplace('https://www.facebook.com/checkpoint/123/')).toBe(false);
    expect(FacebookUrl.isMarketplace('https://example.com/marketplace/')).toBe(false);
  });

  test('recognizes Facebook account checkpoints', () => {
    expect(FacebookUrl.isCheckpoint('https://www.facebook.com/checkpoint/123/', '')).toBe(true);
    expect(FacebookUrl.isCheckpoint('https://www.facebook.com/', 'We suspect automated behavior on your account')).toBe(true);
    expect(FacebookUrl.isCheckpoint('https://www.facebook.com/marketplace/', '<html>Marketplace</html>')).toBe(false);
    expect(FacebookUrl.isCheckpoint('https://example.com/checkpoint/', '')).toBe(false);
  });
});
