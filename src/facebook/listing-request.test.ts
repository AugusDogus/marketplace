import { describe, expect, test } from 'bun:test';

import { FacebookBrowseRequest } from './listing-request';

describe('FacebookBrowseRequest', () => {
  const locations = [
    {
      name: 'Pensacola at any distance',
      request: { location: { label: 'Pensacola, FL', latitude: 30.437, longitude: -87.2093 }, radius: null },
      expectedRadius: 805_000,
    },
    {
      name: 'Austin within 10 miles',
      request: { location: { label: 'Austin, TX', latitude: 30.2672, longitude: -97.7431 }, radius: 10 as const },
      expectedRadius: 16_000,
    },
    {
      name: 'Seattle within 40 miles',
      request: { location: { label: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 }, radius: 40 as const },
      expectedRadius: 64_000,
    },
    {
      name: 'New York within 100 miles',
      request: { location: { label: 'New York, NY', latitude: 40.7128, longitude: -74.006 }, radius: 100 as const },
      expectedRadius: 161_000,
    },
  ] as const;

  for (const { name, request, expectedRadius } of locations) {
    test(`preserves location and converts radius for ${name}`, () => {
      const variables = FacebookBrowseRequest.paginationVariables(request, 'page-cursor');

      expect(variables.buyLocation).toEqual({
        latitude: request.location.latitude,
        longitude: request.location.longitude,
      });
      expect(variables.radius).toBe(expectedRadius);
      expect(variables.cursor).toBe('page-cursor');
    });
  }

  test('matches the Top Picks initial and pagination request shapes', () => {
    const request = {
      location: { label: 'Austin, TX', latitude: 30.2672, longitude: -97.7431 },
      radius: null,
    } as const;

    expect(FacebookBrowseRequest.initialVariables(request)).toEqual({
      buyLocation: { latitude: 30.2672, longitude: -97.7431 },
      count: 1,
      cursor: null,
      imageWidth: 256,
      mediaType: 'image/jpeg',
      radius: 805_000,
      scale: 1,
      sizing: 'cover-fill-cropped',
      useSDFPath: true,
      __relay_internal__pv__CometMarketplaceShouldShowTopPicksStrikethroughrelayprovider: false,
      __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
      __relay_internal__pv__MarketplaceCometAdmodulerelayprovider: true,
      __relay_internal__pv__CometMarketplaceShouldShowFeedShippingIconrelayprovider: false,
    });
    expect(FacebookBrowseRequest.paginationVariables(request, 'page-cursor')).toEqual({
      buyLocation: { latitude: 30.2672, longitude: -97.7431 },
      count: 5,
      cursor: 'page-cursor',
      imageWidth: 256,
      includePDPRelevantListings: false,
      mediaType: 'image/jpeg',
      pdpListingId: '',
      radius: 805_000,
      refinement: null,
      scale: 1,
      sizing: 'cover-fill-cropped',
      useSDFPath: true,
      __relay_internal__pv__CometMarketplaceShouldShowTopPicksStrikethroughrelayprovider: false,
      __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
      __relay_internal__pv__MarketplaceCometAdmodulerelayprovider: true,
      __relay_internal__pv__CometMarketplaceShouldShowFeedShippingIconrelayprovider: false,
    });
  });
});
