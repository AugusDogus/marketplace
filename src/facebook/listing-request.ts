import type { MarketplaceLocation, MarketplaceRadius } from '../domain/marketplace';

type BrowseRequest = {
  location: MarketplaceLocation;
  radius: MarketplaceRadius;
};

type SearchRequest = BrowseRequest & {
  query: string;
};

const radiusInKilometers = (radius: MarketplaceRadius): number =>
  radius === null ? 805 : Math.round(radius * 1.609344);

const commonVariables = (request: BrowseRequest) => ({
  buyLocation: {
    latitude: request.location.latitude,
    longitude: request.location.longitude,
  },
  imageWidth: 256,
  mediaType: 'image/jpeg',
  radius: radiusInKilometers(request.radius) * 1000,
  scale: 1,
  sizing: 'cover-fill-cropped',
  useSDFPath: true,
  __relay_internal__pv__CometMarketplaceShouldShowTopPicksStrikethroughrelayprovider: false,
  __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
  __relay_internal__pv__MarketplaceCometAdmodulerelayprovider: true,
  __relay_internal__pv__CometMarketplaceShouldShowFeedShippingIconrelayprovider: false,
});

const searchParams = (request: SearchRequest) => {
  const radius = radiusInKilometers(request.radius);
  const browseRequestParams = {
    commerce_enable_local_pickup: true,
    commerce_enable_shipping: true,
    commerce_search_and_rp_available: true,
    commerce_search_and_rp_condition: null,
    commerce_search_and_rp_ctime_days: null,
    filter_location_latitude: request.location.latitude,
    filter_location_longitude: request.location.longitude,
    filter_price_lower_bound: 0,
    filter_price_upper_bound: 214748364700,
    filter_radius_km: radius,
  };
  return {
    bqf: { callsite: 'COMMERCE_MKTPLACE_WWW', query: request.query.trim() },
    browse_request_params: browseRequestParams,
    custom_request_params: {
      browse_context: null,
      contextual_filters: [],
      referral_code: null,
      referral_ui_component: null,
      saved_search_strid: null,
      search_vertical: 'C2C',
      seo_url: null,
      serp_landing_settings: { virtual_category_id: '' },
      surface: 'SEARCH',
      virtual_contextual_filters: [],
    },
  };
};

export const FacebookBrowseRequest = {
  initialVariables: (request: BrowseRequest) => ({
    ...commonVariables(request),
    count: 1,
    cursor: null,
  }),
  paginationVariables: (request: BrowseRequest, cursor: string) => ({
    ...commonVariables(request),
    count: 5,
    cursor,
    includePDPRelevantListings: false,
    pdpListingId: '',
    refinement: null,
  }),
} as const;

export const FacebookSearchRequest = {
  initialVariables: (request: SearchRequest) => ({
    buyLocation: {
      latitude: request.location.latitude,
      longitude: request.location.longitude,
    },
    contextual_data: null,
    count: 24,
    cursor: null,
    params: searchParams(request),
    savedSearchID: null,
    savedSearchQuery: request.query.trim(),
    scale: 1,
    shouldDeferNonCritical: false,
    shouldIncludePopularSearches: true,
    topicPageParams: { location_id: null, url: null },
    __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
  }),
  paginationVariables: (request: SearchRequest, cursor: string) => {
    const params = searchParams(request);
    return {
      count: 24,
      cursor,
      params: {
        ...params,
        browse_request_params: {
          ...params.browse_request_params,
          commerce_search_and_rp_category_id: [],
        },
      },
      scale: 1,
      __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
    };
  },
} as const;
