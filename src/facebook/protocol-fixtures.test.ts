import { describe, expect, test } from 'bun:test';

import { CometRequestMetadata } from './comet-context';
import { FacebookListingResponse } from './listing-response';

const fixture = (name: string): Promise<string> => Bun.file(`${import.meta.dir}/fixtures/${name}`).text();

describe('sanitized Facebook protocol fixtures', () => {
  test('derives the Comet request context used by Marketplace GraphQL', async () => {
    const html = await fixture('comet-marketplace.html');
    const result = CometRequestMetadata.fromHtml(html);

    expect(result.ok).toBeTrue();
    if (!result.ok) return;
    expect(result.value).toEqual({
      cometRequest: '15',
      devicePixelRatio: '1',
      dynamicModules: '0p86e03YS17w2eUe81go0rsw',
      hasteSession: 'fixture.comet_pkg.2.1...0',
      hsi: '1000000000000000000',
      revision: '1234567890',
      routeName: 'comet.fbweb.CometMarketplaceHomeRoute',
      spinTime: '1700000000',
    });
  });

  test('parses deferred listings and the connection cursor', async () => {
    const response = await fixture('listing-pagination.jsonl');

    expect(FacebookListingResponse.inspect(response, 1_700_007_200_000)).toEqual({
      tag: 'page',
      listings: [
        {
          id: '100000000000001',
          title: 'Sanitized road bike',
          price: 125,
          formattedPrice: '$125',
          city: 'Austin',
          state: 'TX',
          category: 'Other',
          image: { uri: 'https://example.invalid/listing.jpg' },
          pickupOptions: [],
          listedAgo: '2 hours ago',
        },
      ],
      nextCursor: 'sanitized-next-page-cursor',
    });
  });

  test('stops pagination when Facebook reports no next page', () => {
    const response = '{"data":{"page_info":{"end_cursor":"ignored-cursor","has_next_page":false}}}';

    expect(FacebookListingResponse.inspect(response)).toEqual({ tag: 'empty', nextCursor: null });
  });

  test('detects a deferred response that omits listing details', () => {
    const response = '{"data":{"marketplace_home_feed":{"edges":[],"page_info":{"end_cursor":"retry-cursor","has_next_page":true}}}}';

    expect(FacebookListingResponse.inspect(response)).toEqual({
      tag: 'missing_listing_data',
      nextCursor: 'retry-cursor',
    });
  });

  test('detects a response outside the known Marketplace protocol', () => {
    expect(FacebookListingResponse.inspect('{"data":{"viewer":{"id":"fixture-user"}}}')).toEqual({
      tag: 'unrecognized',
    });
  });
});
