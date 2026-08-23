import { describe, expect, test } from 'bun:test';

import { FacebookSearchRequest } from './listing-request';

describe('FacebookSearchRequest', () => {
  const searches = [
    {
      name: 'Austin at any distance',
      request: {
        query: '  honda civic  ',
        location: { label: 'Austin, TX', latitude: 30.2672, longitude: -97.7431 },
        radius: null,
      },
      expectedRadius: 805,
    },
    {
      name: 'Pensacola within 10 miles',
      request: {
        query: 'camera',
        location: { label: 'Pensacola, FL', latitude: 30.437, longitude: -87.2093 },
        radius: 10 as const,
      },
      expectedRadius: 16,
    },
    {
      name: 'Seattle within 100 miles',
      request: {
        query: 'desk',
        location: { label: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 },
        radius: 100 as const,
      },
      expectedRadius: 161,
    },
  ] as const;

  for (const { name, request, expectedRadius } of searches) {
    test(`preserves search filters for ${name}`, () => {
      const variables = FacebookSearchRequest.paginationVariables(request, 'search-cursor');
      const filters = variables.params.browse_request_params;

      expect(variables.cursor).toBe('search-cursor');
      expect(variables.params.bqf.query).toBe(request.query.trim());
      expect(filters.filter_location_latitude).toBe(request.location.latitude);
      expect(filters.filter_location_longitude).toBe(request.location.longitude);
      expect(filters.filter_radius_km).toBe(expectedRadius);
      expect(filters.commerce_search_and_rp_category_id).toEqual([]);
    });
  }

  test('matches the search initial and pagination contracts', () => {
    const request = {
      query: '  road bike  ',
      location: { label: 'Austin, TX', latitude: 30.2672, longitude: -97.7431 },
      radius: 40,
    } as const;

    const initial = FacebookSearchRequest.initialVariables(request);
    const pagination = FacebookSearchRequest.paginationVariables(request, 'next-search-page');

    expect(initial.buyLocation).toEqual({ latitude: 30.2672, longitude: -97.7431 });
    expect(initial.count).toBe(24);
    expect(initial.cursor).toBeNull();
    expect(initial.savedSearchQuery).toBe('road bike');
    expect(initial.shouldDeferNonCritical).toBeFalse();
    expect(initial.shouldIncludePopularSearches).toBeTrue();
    expect(initial.params.browse_request_params.filter_radius_km).toBe(64);
    expect('commerce_search_and_rp_category_id' in initial.params.browse_request_params).toBeFalse();

    expect(pagination.count).toBe(24);
    expect(pagination.cursor).toBe('next-search-page');
    expect(pagination.params.bqf).toEqual({
      callsite: 'COMMERCE_MKTPLACE_WWW',
      query: 'road bike',
    });
    expect(pagination.params.custom_request_params.surface).toBe('SEARCH');
    expect(pagination.params.browse_request_params.commerce_search_and_rp_category_id).toEqual([]);
  });
});
