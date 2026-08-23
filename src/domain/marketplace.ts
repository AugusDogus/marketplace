import type { ImageSourcePropType } from 'react-native';

export type ListingCategory =
  | 'Vehicles'
  | 'Electronics'
  | 'Home & garden'
  | 'Clothing'
  | 'Hobbies'
  | 'Other';

export type Listing = {
  id: string;
  title: string;
  price: number;
  formattedPrice: string;
  city: string;
  state: string;
  category: ListingCategory;
  image: ImageSourcePropType;
  pickupOptions: readonly ('Door pickup' | 'Public meetup')[];
  listedAgo: string;
};

export type ListingDetail = {
  description: string | null;
  sellerName: string | null;
  sellerAvatarUrl: string | null;
};

export type ListingDetailState =
  | { status: 'loading' }
  | { status: 'loaded'; detail: ListingDetail }
  | { status: 'error'; message: string };

export type MarketplaceFilters = {
  category: ListingCategory | null;
  minPrice: string;
  maxPrice: string;
  location: MarketplaceLocation;
  radius: MarketplaceRadius;
  localPickupOnly: boolean;
};

export type MarketplaceRadius = 10 | 40 | 100 | null;

export type MarketplaceLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

const defaultLocation: MarketplaceLocation = {
  label: 'Pensacola, FL',
  latitude: 30.437,
  longitude: -87.2093,
};

export const MarketplaceLocation = {
  default: (): MarketplaceLocation => ({ ...defaultLocation }),
  equals: (left: MarketplaceLocation, right: MarketplaceLocation): boolean =>
    left.latitude === right.latitude && left.longitude === right.longitude,
} as const;

export const MarketplaceFilters = {
  default: (): MarketplaceFilters => ({
    category: null,
    minPrice: '',
    maxPrice: '',
    location: MarketplaceLocation.default(),
    radius: null,
    localPickupOnly: false,
  }),
  count: (filters: MarketplaceFilters): number =>
    Number(filters.category !== null) +
    Number(filters.minPrice !== '') +
    Number(filters.maxPrice !== '') +
    Number(!MarketplaceLocation.equals(filters.location, defaultLocation)) +
    Number(filters.radius !== null) +
    Number(filters.localPickupOnly),
} as const;

type SavedSearchBase = {
  id: string;
  label: string;
  query: string;
  createdAt: string;
  filters: MarketplaceFilters;
};

export type SavedSearch =
  | (SavedSearchBase & { provider: 'facebook' })
  | (SavedSearchBase & { provider: 'legacy-local' });

export type MarketplaceNotification = {
  id: string;
  body: string;
  createdAt: number | null;
  imageUrl: string | null;
  type: string | null;
  url: string | null;
};

const parsePrice = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const filterListings = (
  listings: readonly Listing[],
  query: string,
  filters: MarketplaceFilters,
): Listing[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const minPrice = parsePrice(filters.minPrice);
  const maxPrice = parsePrice(filters.maxPrice);

  return listings.filter((listing) => {
    if (
      normalizedQuery !== '' &&
      !`${listing.title} ${listing.city} ${listing.state}`
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    ) {
      return false;
    }
    if (filters.category !== null && listing.category !== filters.category) return false;
    if (minPrice !== null && listing.price < minPrice) return false;
    if (maxPrice !== null && listing.price > maxPrice) return false;
    if (filters.localPickupOnly && listing.pickupOptions.length === 0) return false;
    return true;
  });
};

export const describeFilters = (query: string, filters: MarketplaceFilters): string => {
  const parts = [query.trim() || 'All Marketplace'];
  if (filters.category !== null) parts.push(filters.category);
  if (filters.minPrice !== '') parts.push(`$${filters.minPrice}+`);
  if (filters.maxPrice !== '') parts.push(`up to $${filters.maxPrice}`);
  parts.push(filters.location.label);
  if (filters.radius !== null) parts.push(`within ${filters.radius} mi`);
  return parts.join(' · ');
};
