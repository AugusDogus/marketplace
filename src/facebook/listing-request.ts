import type { MarketplaceLocation, MarketplaceRadius } from '../domain/marketplace';

type BrowseRequest = {
  location: MarketplaceLocation;
  radius: MarketplaceRadius;
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
