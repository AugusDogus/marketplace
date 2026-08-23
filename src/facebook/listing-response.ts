import type { Listing } from '../domain/marketplace';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const payloadsFrom = (source: string): Record<string, unknown>[] =>
  source.split(/\r?\n/).flatMap((line) => {
    const cleaned = line.replace(/^for \(;;\);/, '').trim();
    if (cleaned === '') return [];
    try {
      const payload: unknown = JSON.parse(cleaned);
      return isRecord(payload) ? [payload] : [];
    } catch {
      return [];
    }
  });

const relativeTime = (timestamp: number, now: number): string => {
  const elapsedSeconds = Math.max(0, Math.floor(now / 1000) - timestamp);
  if (elapsedSeconds < 3600) return `${Math.max(1, Math.floor(elapsedSeconds / 60))} minutes ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hours ago`;
  const days = Math.floor(elapsedSeconds / 86400);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};

const listingFrom = (value: unknown, now: number): Listing | null => {
  if (!isRecord(value) || !isRecord(value.listing) || !isRecord(value.data)) return null;
  const listing = value.listing;
  const data = value.data;
  const priceData = isRecord(data.price) ? data.price : null;
  const photo = isRecord(value.photo) ? value.photo : null;
  const defaultImage = photo !== null && isRecord(photo.default_image) ? photo.default_image : null;
  const entity = isRecord(value.entity) ? value.entity : null;
  const location = entity !== null && isRecord(entity.location) ? entity.location : null;
  const reverseGeocode = location !== null && isRecord(location.reverse_geocode) ? location.reverse_geocode : null;
  if (
    typeof listing.id !== 'string' ||
    typeof listing.creation_time !== 'number' ||
    typeof data.title !== 'string' ||
    priceData === null ||
    typeof priceData.amount_with_offset !== 'string' ||
    defaultImage === null ||
    typeof defaultImage.uri !== 'string' ||
    reverseGeocode === null ||
    typeof reverseGeocode.city !== 'string' ||
    typeof reverseGeocode.state !== 'string'
  ) return null;
  const price = Number(priceData.amount_with_offset) / 100;
  if (!Number.isFinite(price)) return null;
  const currency = typeof priceData.currency === 'string' ? priceData.currency : 'USD';
  return {
    id: listing.id,
    title: data.title,
    price,
    formattedPrice: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    }).format(price),
    city: reverseGeocode.city,
    state: reverseGeocode.state,
    category: 'Other',
    image: { uri: defaultImage.uri },
    pickupOptions: [],
    listedAgo: relativeTime(listing.creation_time, now),
  };
};

type PageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
};

export type FacebookListingResponseInspection =
  | { tag: 'page'; listings: readonly Listing[]; nextCursor: string | null }
  | { tag: 'empty'; nextCursor: null }
  | { tag: 'missing_listing_data'; nextCursor: string | null }
  | { tag: 'unrecognized' };

const pageInfoFrom = (value: unknown, depth = 0): PageInfo | null => {
  if (depth > 10) return null;
  if (Array.isArray(value)) {
    let found: PageInfo | null = null;
    for (const item of value) found = pageInfoFrom(item, depth + 1) ?? found;
    return found;
  }
  if (!isRecord(value)) return null;
  if (
    typeof value.has_next_page === 'boolean' &&
    (typeof value.end_cursor === 'string' || value.end_cursor === null)
  ) {
    return { endCursor: value.end_cursor, hasNextPage: value.has_next_page };
  }
  let found: PageInfo | null = null;
  for (const child of Object.values(value)) found = pageInfoFrom(child, depth + 1) ?? found;
  return found;
};

const decodeJsonString = (value: string): string => {
  try {
    const parsed: unknown = JSON.parse(`"${value}"`);
    return typeof parsed === 'string' ? parsed : value;
  } catch {
    return value.replaceAll('\\/', '/');
  }
};

const pageInfoFromHtml = (source: string): PageInfo | null => {
  const normalized = source.includes('\\"end_cursor\\"') ? source.replaceAll('\\"', '"') : source;
  let found: PageInfo | null = null;
  for (const match of normalized.matchAll(/"end_cursor":"((?:\\.|[^"\\])*)","has_next_page":(true|false)/g)) {
    const cursor = match[1];
    const hasNextPage = match[2];
    if (cursor !== undefined && hasNextPage !== undefined) {
      found = { endCursor: decodeJsonString(cursor), hasNextPage: hasNextPage === 'true' };
    }
  }
  return found;
};

const pageInfoFromResponse = (source: string): PageInfo | null => {
  let pageInfo: PageInfo | null = null;
  for (const payload of payloadsFrom(source)) pageInfo = pageInfoFrom(payload) ?? pageInfo;
  return pageInfo ?? pageInfoFromHtml(source);
};

const listingsFrom = (source: string, now: number): readonly Listing[] => {
  const nodes: unknown[] = [];
  for (const payload of payloadsFrom(source)) {
    if (!isRecord(payload.data)) continue;
    const data = payload.data;
    if (isRecord(data.node)) nodes.push(data.node);
    if (!isRecord(data.marketplace_home_feed) || !Array.isArray(data.marketplace_home_feed.edges)) continue;
    for (const edge of data.marketplace_home_feed.edges) {
      if (isRecord(edge) && isRecord(edge.node)) nodes.push(edge.node);
    }
  }
  const seen = new Set<string>();
  return nodes.flatMap((node) => {
    const listing = listingFrom(node, now);
    if (listing === null || seen.has(listing.id)) return [];
    seen.add(listing.id);
    return [listing];
  });
};

const hasHomeFeed = (source: string): boolean =>
  payloadsFrom(source).some((payload) => isRecord(payload.data) && isRecord(payload.data.marketplace_home_feed));

const inspect = (source: string, now: number): FacebookListingResponseInspection => {
  const listings = listingsFrom(source, now);
  const pageInfo = pageInfoFromResponse(source);
  const nextCursor = pageInfo?.hasNextPage === true && pageInfo.endCursor !== null
    ? pageInfo.endCursor
    : null;
  if (listings.length > 0) return { tag: 'page', listings, nextCursor };
  if (pageInfo?.hasNextPage === false) return { tag: 'empty', nextCursor: null };
  if (hasHomeFeed(source) || pageInfo !== null) return { tag: 'missing_listing_data', nextCursor };
  return { tag: 'unrecognized' };
};

export const FacebookListingResponse = {
  inspect: (source: string, now = Date.now()): FacebookListingResponseInspection => inspect(source, now),
} as const;
