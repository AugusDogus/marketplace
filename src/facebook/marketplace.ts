import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

import type {
  Listing,
  ListingCategory,
  ListingDetail,
  MarketplaceFilters,
  MarketplaceLocation,
  MarketplaceNotification,
} from '../domain/marketplace';
import { CometRequestMetadata, type CometRequestMetadata as RequestMetadata } from './comet-context';
import { FacebookRequestProfile } from './request-profile';
import { FacebookSession, type FacebookSession as Session } from './session';

export type MarketplaceError = {
  tag: 'not_authenticated' | 'unsupported_platform' | 'request_failed' | 'session_expired' | 'response_changed' | 'listing_unavailable';
  message: string;
};

export type MarketplaceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: MarketplaceError };

export type ListingRequest = Pick<MarketplaceFilters, 'location' | 'radius'> & { query: string };

export type MarketplaceLocationSuggestion = {
  location: MarketplaceLocation;
  subtitle: string;
};

type AuthenticatedResponse = { body: string; url: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const browseQueryDocumentId = '28053535904279798';
const browsePaginationDocumentId = '28036163469355579';
const createSavedSearchDocumentId = '9487446391373396';
const deleteSavedSearchDocumentId = '24395744416699573';
const locationQueryDocumentId = '9660140454040174';
const notificationsQueryDocumentId = '28153689817567734';
const searchQueryDocumentId = '27517490627932547';
const searchPaginationDocumentId = '27212616558440397';

type GraphContext = {
  dtsg: string;
  lsd: string;
  metadata: RequestMetadata;
  pageUrl: string;
  userId: string;
};

export type SavedSearchRequest = {
  filters: MarketplaceFilters;
  query: string;
};

export type ListingPage = {
  listings: readonly Listing[];
  nextCursor: string | null;
};

export type FacebookSavedSearch = {
  id: string;
  status: 'ACTIVE';
};

const categoryById: Record<string, ListingCategory> = {
  '807311116002614': 'Vehicles',
  '757715671026531': 'Vehicles',
  '686977074745292': 'Electronics',
  '1792291877663080': 'Electronics',
  '613858625416355': 'Electronics',
  '678754142233400': 'Home & garden',
  '1583634935226685': 'Home & garden',
  '931157863635831': 'Clothing',
  '214968118845643': 'Clothing',
  '606456512821491': 'Hobbies',
};

const locationAliases: Record<string, string> = {
  'new york': 'nyc',
  'new york city': 'nyc',
  'los angeles': 'la',
  'washington dc': 'washington-dc',
  'washington d c': 'washington-dc',
};

const decodeJsonString = (value: string): string => {
  try {
    const parsed: unknown = JSON.parse(`"${value}"`);
    return typeof parsed === 'string' ? parsed : value;
  } catch {
    return value.replaceAll('\\/', '/');
  }
};

const firstCapture = (source: string, pattern: RegExp): string | null => pattern.exec(source)?.[1] ?? null;

const relativeTime = (timestamp: number): string => {
  const elapsedSeconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (elapsedSeconds < 3600) return `${Math.max(1, Math.floor(elapsedSeconds / 60))} minutes ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hours ago`;
  const days = Math.floor(elapsedSeconds / 86400);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};

const pickupOptionsFrom = (deliveryTypes: string): ('Door pickup' | 'Public meetup')[] => {
  const options: ('Door pickup' | 'Public meetup')[] = [];
  if (deliveryTypes.includes('DOOR_PICKUP')) options.push('Door pickup');
  if (deliveryTypes.includes('PUBLIC_MEETUP') || deliveryTypes.includes('IN_PERSON')) options.push('Public meetup');
  return options;
};

const listingPattern = /"id":"(\d+)","__isMarketplaceListingWithTagging"[\s\S]*?"creation_time":(\d+)[\s\S]*?"primary_listing_photo":\{[\s\S]*?"uri":"([^"]+)"[\s\S]*?"listing_price":\{"amount":"([^"]+)"\},"formatted_price":\{"text":"([^"]+)"\},"location":\{"reverse_geocode":\{"city":"([^"]+)","state":"([^"]+)"[\s\S]*?"marketplace_listing_category_id":"([^"]+)","marketplace_listing_title":"([^"]+)"[\s\S]*?"delivery_types":\[([^\]]*)\]/g;

const parseStrictListings = (source: string): Listing[] => {
  const listings: Listing[] = [];
  for (const match of source.matchAll(listingPattern)) {
    const [id, creationTime, imageUrl, amount, formattedPrice, city, state, categoryId, title, deliveryTypes] = match.slice(1);
    if ([id, creationTime, imageUrl, amount, formattedPrice, city, state, categoryId, title, deliveryTypes].some((value) => value === undefined)) continue;
    const price = Number(amount);
    if (!Number.isFinite(price)) continue;
    listings.push({
      id,
      title: decodeJsonString(title),
      price,
      formattedPrice: decodeJsonString(formattedPrice),
      city: decodeJsonString(city),
      state: decodeJsonString(state),
      category: categoryById[categoryId] ?? 'Other',
      image: { uri: decodeJsonString(imageUrl) },
      pickupOptions: pickupOptionsFrom(deliveryTypes),
      listedAgo: relativeTime(Number(creationTime)),
    });
  }
  return listings;
};

const parseFlexibleListings = (source: string): Listing[] => {
  const markers = [...source.matchAll(/"listing":\{/g)]
    .map((match) => match.index)
    .filter((index): index is number => index !== undefined);
  const listings: Listing[] = [];
  markers.forEach((start, index) => {
    const next = markers[index + 1] ?? source.length;
    const segment = source.slice(start, Math.min(next, start + 20_000));
    const id = firstCapture(segment, /"id":"(\d+)"/);
    const title = firstCapture(segment, /"marketplace_listing_title":"([^"]+)"/);
    const imageUrl = firstCapture(segment, /"primary_listing_photo":\{[\s\S]{0,3000}?"uri":"([^"]+)"/);
    const amount = firstCapture(segment, /"listing_price":\{[\s\S]{0,500}?"amount":"([^"]+)"/);
    const formattedPrice = firstCapture(segment, /"listing_price":\{[\s\S]{0,700}?"formatted_amount":"([^"]+)"/)
      ?? firstCapture(segment, /"formatted_price":\{"text":"([^"]+)"/);
    const location = firstCapture(segment, /"reverse_geocode":\{([\s\S]{0,800}?)\}/);
    const city = location === null ? null : firstCapture(location, /"city":"([^"]+)"/);
    const state = location === null ? null : firstCapture(location, /"state":"([^"]+)"/);
    const categoryId = firstCapture(segment, /"marketplace_listing_category_id":"([^"]+)"/);
    const creationTime = firstCapture(segment, /"creation_time":(\d+)/);
    const deliveryTypes = firstCapture(segment, /"delivery_types":\[([^\]]*)\]/) ?? '';
    if (id === null || title === null || imageUrl === null || amount === null || formattedPrice === null || city === null || state === null) return;
    const price = Number(amount);
    if (!Number.isFinite(price)) return;
    listings.push({
      id,
      title: decodeJsonString(title),
      price,
      formattedPrice: decodeJsonString(formattedPrice),
      city: decodeJsonString(city),
      state: decodeJsonString(state),
      category: categoryId === null ? 'Other' : categoryById[categoryId] ?? 'Other',
      image: { uri: decodeJsonString(imageUrl) },
      pickupOptions: pickupOptionsFrom(deliveryTypes),
      listedAgo: relativeTime(creationTime === null ? Math.floor(Date.now() / 1000) : Number(creationTime)),
    });
  });
  return listings;
};

const parseListings = (source: string): Listing[] => {
  const seen = new Set<string>();
  return [...parseStrictListings(source), ...parseFlexibleListings(source)].filter((listing) => {
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
};

const parseGraphListing = (value: unknown): Listing | null => {
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
    listedAgo: relativeTime(listing.creation_time),
  };
};

const parseGraphListings = (source: string): Listing[] => {
  const nodes: unknown[] = [];
  for (const line of source.split(/\r?\n/)) {
    const cleaned = line.replace(/^for \(;;\);/, '').trim();
    if (cleaned === '') continue;
    let payload: unknown;
    try {
      payload = JSON.parse(cleaned);
    } catch {
      continue;
    }
    if (!isRecord(payload) || !isRecord(payload.data)) continue;
    const data = payload.data;
    if (isRecord(data.node)) nodes.push(data.node);
    if (!isRecord(data.marketplace_home_feed) || !Array.isArray(data.marketplace_home_feed.edges)) continue;
    for (const edge of data.marketplace_home_feed.edges) {
      if (isRecord(edge) && isRecord(edge.node)) nodes.push(edge.node);
    }
  }
  const seen = new Set<string>();
  return nodes.flatMap((node) => {
    const listing = parseGraphListing(node);
    if (listing === null || seen.has(listing.id)) return [];
    seen.add(listing.id);
    return [listing];
  });
};

const graphListingPattern = /"data":\{"product_item_id":"[^"]+"[\s\S]{0,2000}?"title":"([^"]+)"[\s\S]{0,500}?"price":\{"currency":"([^"]+)","amount_with_offset":"([^"]+)"\}[\s\S]{0,2000}?"listing":\{[\s\S]{0,300}?"id":"(\d+)"[\s\S]{0,300}?"creation_time":(\d+)[\s\S]{0,3000}?"photo":\{[\s\S]{0,500}?"default_image":\{"uri":"([^"]+)"[\s\S]{0,3000}?"entity":\{[\s\S]{0,1000}?"reverse_geocode":\{"city":"([^"]+)","state":"([^"]+)"/g;

const parseRawGraphListings = (source: string): Listing[] => {
  const listings: Listing[] = [];
  for (const match of source.matchAll(graphListingPattern)) {
    const [title, currency, amountWithOffset, id, creationTime, imageUrl, city, state] = match.slice(1);
    if ([title, currency, amountWithOffset, id, creationTime, imageUrl, city, state].some((value) => value === undefined)) continue;
    const price = Number(amountWithOffset) / 100;
    if (!Number.isFinite(price)) continue;
    listings.push({
      id,
      title: decodeJsonString(title),
      price,
      formattedPrice: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
      }).format(price),
      city: decodeJsonString(city),
      state: decodeJsonString(state),
      category: 'Other',
      image: { uri: decodeJsonString(imageUrl) },
      pickupOptions: [],
      listedAgo: relativeTime(Number(creationTime)),
    });
  }
  return listings;
};

const graphPayloads = (source: string): Record<string, unknown>[] =>
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

type FacebookPageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
};

const pageInfoFromValue = (value: unknown, depth = 0): FacebookPageInfo | null => {
  if (depth > 10) return null;
  if (Array.isArray(value)) {
    let found: FacebookPageInfo | null = null;
    for (const item of value) found = pageInfoFromValue(item, depth + 1) ?? found;
    return found;
  }
  if (!isRecord(value)) return null;
  if (
    typeof value.has_next_page === 'boolean' &&
    (typeof value.end_cursor === 'string' || value.end_cursor === null)
  ) {
    return { endCursor: value.end_cursor, hasNextPage: value.has_next_page };
  }
  let found: FacebookPageInfo | null = null;
  for (const child of Object.values(value)) found = pageInfoFromValue(child, depth + 1) ?? found;
  return found;
};

const pageInfoFromGraphResponse = (source: string): FacebookPageInfo | null => {
  let found: FacebookPageInfo | null = null;
  for (const payload of graphPayloads(source)) found = pageInfoFromValue(payload) ?? found;
  return found;
};

const pageInfoFromHtml = (source: string): FacebookPageInfo | null => {
  const normalized = source.includes('\\"end_cursor\\"') ? source.replaceAll('\\"', '"') : source;
  let found: FacebookPageInfo | null = null;
  for (const match of normalized.matchAll(/"end_cursor":"((?:\\.|[^"\\])*)","has_next_page":(true|false)/g)) {
    const cursor = match[1];
    const hasNextPage = match[2];
    if (cursor !== undefined && hasNextPage !== undefined) {
      found = { endCursor: decodeJsonString(cursor), hasNextPage: hasNextPage === 'true' };
    }
  }
  return found;
};

const nextCursorFrom = (source: string): string | null => {
  const pageInfo = pageInfoFromGraphResponse(source) ?? pageInfoFromHtml(source);
  return pageInfo?.hasNextPage === true && pageInfo.endCursor !== null ? pageInfo.endCursor : null;
};

const priceInMinorUnits = (value: string, fallback: number): number | null => {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
};

const notificationFrom = (value: unknown): MarketplaceNotification | null => {
  if (!isRecord(value)) return null;
  const notification = isRecord(value.notif) ? value.notif : value;
  const body = isRecord(notification.body) ? notification.body : null;
  const creationTime = isRecord(notification.creation_time_with_relative_text)
    ? notification.creation_time_with_relative_text
    : null;
  const image = isRecord(notification.notif_image) ? notification.notif_image : null;
  const id = typeof notification.id === 'string' ? notification.id : null;
  const text = body !== null && typeof body.text === 'string' ? body.text : null;
  if (id === null || text === null) return null;
  const rawTimestamp = creationTime?.timestamp;
  const timestamp = typeof rawTimestamp === 'number'
    ? rawTimestamp
    : typeof rawTimestamp === 'string'
      ? Number(rawTimestamp)
      : Number.NaN;
  const url = typeof notification.mobileUrl === 'string'
    ? notification.mobileUrl
    : typeof notification.web_link === 'string'
      ? notification.web_link
      : typeof notification.url === 'string'
        ? notification.url
        : null;
  return {
    id,
    body: text,
    createdAt: Number.isFinite(timestamp) ? timestamp : null,
    imageUrl: image !== null && typeof image.uri === 'string' ? image.uri : null,
    type: typeof notification.notif_type === 'string' ? notification.notif_type : null,
    url,
  };
};

const marketplaceNotifications = (source: string): MarketplaceNotification[] => {
  const seen = new Set<string>();
  const notifications: MarketplaceNotification[] = [];
  for (const payload of graphPayloads(source)) {
    if (!isRecord(payload.data) || !isRecord(payload.data.viewer)) continue;
    const page = payload.data.viewer.notifications_page;
    if (!isRecord(page) || !Array.isArray(page.edges)) continue;
    for (const edge of page.edges) {
      if (!isRecord(edge)) continue;
      const notification = notificationFrom(edge.node);
      if (notification === null || seen.has(notification.id)) continue;
      seen.add(notification.id);
      notifications.push(notification);
    }
  }
  return notifications;
};

const createdSavedSearch = (source: string): FacebookSavedSearch | null => {
  for (const payload of graphPayloads(source)) {
    if (!isRecord(payload.data) || !isRecord(payload.data.marketplace_create_saved_search)) continue;
    const edge = payload.data.marketplace_create_saved_search.saved_search_edge;
    if (!isRecord(edge) || !isRecord(edge.node)) continue;
    if (typeof edge.node.id === 'string' && edge.node.search_status === 'ACTIVE') {
      return { id: edge.node.id, status: 'ACTIVE' };
    }
  }
  return null;
};

const deletedSavedSearchId = (source: string): string | null => {
  for (const payload of graphPayloads(source)) {
    if (!isRecord(payload.data) || !isRecord(payload.data.marketplace_delete_saved_search)) continue;
    const id = payload.data.marketplace_delete_saved_search.deleted_saved_search_id;
    if (typeof id === 'string') return id;
  }
  return null;
};

const graphErrorMessage = (source: string): string | null => {
  if (!source.includes('"errors"')) return null;
  const message = firstCapture(source, /"message":"([^"]+)"/);
  return message === null ? 'Facebook rejected the Marketplace filter request.' : decodeJsonString(message);
};

const graphContextFrom = async (page: AuthenticatedResponse): Promise<MarketplaceResult<GraphContext>> => {
  const lsd = firstCapture(page.body, /"LSD",\[\],\{"token":"([^"]+)"/);
  const dtsg = firstCapture(page.body, /"DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  const metadata = CometRequestMetadata.fromHtml(page.body);
  const loaded = await loadNormalizedSession();
  if (lsd === null || dtsg === null || !metadata.ok || !loaded.ok) {
    return { ok: false, error: { tag: 'response_changed', message: 'Facebook did not provide the request data needed to apply this location.' } };
  }
  const userId = loaded.value.cookies.c_user;
  if (userId === undefined) {
    return { ok: false, error: { tag: 'session_expired', message: 'The Facebook session is missing its signed-in account cookie. Sign in again.' } };
  }
  return { ok: true, value: { dtsg, lsd, metadata: metadata.value, pageUrl: page.url, userId } };
};

const graphRequest = async (
  context: GraphContext,
  operation: { friendlyName: string; documentId: string; variables: unknown },
): Promise<MarketplaceResult<AuthenticatedResponse>> => {
  const form = new URLSearchParams({
    av: context.userId,
    __aaid: '0',
    __user: context.userId,
    __a: '1',
    __req: '1',
    __hs: context.metadata.hasteSession,
    dpr: context.metadata.devicePixelRatio,
    __ccg: 'EXCELLENT',
    __rev: context.metadata.revision,
    __hsi: context.metadata.hsi,
    __dyn: context.metadata.dynamicModules,
    __comet_req: context.metadata.cometRequest,
    fb_dtsg: context.dtsg,
    jazoest: `2${[...context.dtsg].map((character) => character.charCodeAt(0)).join('')}`,
    lsd: context.lsd,
    __spin_r: context.metadata.revision,
    __spin_b: 'trunk',
    __spin_t: context.metadata.spinTime,
    fb_api_caller_class: 'RelayModern',
    fb_api_req_friendly_name: operation.friendlyName,
    server_timestamps: 'true',
    variables: JSON.stringify(operation.variables),
    doc_id: operation.documentId,
  });
  if (context.metadata.routeName !== null) form.set('__crn', context.metadata.routeName);
  return authenticatedRequest('https://www.facebook.com/api/graphql/', {
    method: 'POST',
    body: form.toString(),
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://www.facebook.com',
      Referer: context.pageUrl,
      'x-asbd-id': '129477',
      'x-fb-friendly-name': operation.friendlyName,
      'x-fb-lsd': context.lsd,
    },
  });
};

const locationSuggestions = (source: string): MarketplaceLocationSuggestion[] => {
  const suggestions: MarketplaceLocationSuggestion[] = [];
  for (const line of source.split(/\r?\n/)) {
    const cleaned = line.replace(/^for \(;;\);/, '').trim();
    if (cleaned === '') continue;
    let payload: unknown;
    try {
      payload = JSON.parse(cleaned);
    } catch {
      continue;
    }
    if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.city_street_search)) continue;
    const results = payload.data.city_street_search.street_results;
    if (!isRecord(results) || !Array.isArray(results.edges)) continue;
    for (const edge of results.edges) {
      if (!isRecord(edge) || !isRecord(edge.node) || !isRecord(edge.node.location)) continue;
      const { latitude, longitude } = edge.node.location;
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        typeof edge.node.single_line_address !== 'string' ||
        typeof edge.node.subtitle !== 'string'
      ) continue;
      suggestions.push({
        location: { label: edge.node.single_line_address, latitude, longitude },
        subtitle: edge.node.subtitle,
      });
    }
  }
  return suggestions;
};

const searchLocations = async (
  page: AuthenticatedResponse,
  context: GraphContext,
  query: string,
): Promise<MarketplaceResult<readonly MarketplaceLocationSuggestion[]>> => {
  const currentLocation = [...page.body.matchAll(/"buyLocation":\{"latitude":(-?[\d.]+),"longitude":(-?[\d.]+)/g)].at(-1);
  const viewerCoordinates = {
    latitude: currentLocation?.[1] === undefined ? 0 : Number(currentLocation[1]),
    longitude: currentLocation?.[2] === undefined ? 0 : Number(currentLocation[2]),
  };
  const response = await graphRequest(context, {
    friendlyName: 'MarketplaceSearchAddressDataSourceQuery',
    documentId: locationQueryDocumentId,
    variables: {
      params: {
        caller: 'MARKETPLACE',
        country_filter: null,
        integration_strategy: 'STRING_MATCH',
        page_category: ['CITY', 'SUBCITY', 'NEIGHBORHOOD', 'POSTAL_CODE'],
        query: query.trim(),
        search_type: 'PLACE_TYPEAHEAD',
        viewer_coordinates: viewerCoordinates,
      },
    },
  });
  if (!response.ok) return response;
  const graphError = graphErrorMessage(response.value.body);
  if (graphError !== null) {
    return { ok: false, error: { tag: 'request_failed', message: `Facebook could not find this location: ${graphError}` } };
  }
  return { ok: true, value: locationSuggestions(response.value.body) };
};

const getSetCookies = (headers: Headers): string[] => {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = headers.get('set-cookie');
  return single === null ? [] : [single];
};

const loadNormalizedSession = async (): Promise<MarketplaceResult<Session>> => {
  if (Platform.OS === 'web') {
    return { ok: false, error: { tag: 'unsupported_platform', message: 'Direct Facebook requests are available in the iOS and Android app, not the web preview.' } };
  }
  const loaded = await FacebookSession.load();
  if (!loaded.ok || loaded.value === null) {
    return { ok: false, error: { tag: 'not_authenticated', message: loaded.ok ? 'Sign in to Facebook or import an authenticated HAR to continue.' : loaded.error.message } };
  }
  return { ok: true, value: { ...loaded.value, headers: FacebookRequestProfile.marketplaceDesktop } };
};

const authenticatedRequest = async (
  url: string,
  options: { method?: 'GET' | 'POST'; body?: string; headers?: Record<string, string> } = {},
): Promise<MarketplaceResult<AuthenticatedResponse>> => {
  const loaded = await loadNormalizedSession();
  if (!loaded.ok) return loaded;
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: { ...loaded.value.headers, ...options.headers, Cookie: FacebookSession.cookieHeader(loaded.value) },
      redirect: 'follow',
    });
  } catch {
    return { ok: false, error: { tag: 'request_failed', message: 'Facebook could not be reached. Check the device connection and try again.' } };
  }
  const body = await response.text();
  await FacebookSession.save(FacebookSession.withSetCookies(loaded.value, getSetCookies(response.headers)));
  if (response.url.includes('/login') || body.includes('id="login_form"')) {
    return { ok: false, error: { tag: 'session_expired', message: 'The Facebook session has expired. Sign in again or import a fresh HAR.' } };
  }
  if (!response.ok) {
    return { ok: false, error: { tag: 'request_failed', message: `Facebook returned HTTP ${response.status}. Your saved session remains intact.` } };
  }
  return { ok: true, value: { body, url: response.url } };
};

const locationSlug = (location: string): string => {
  const city = location.split(',')[0]?.trim().toLocaleLowerCase() ?? '';
  const normalized = city.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return locationAliases[normalized] ?? normalized.replaceAll(' ', '-');
};

const marketplaceUrl = (request: ListingRequest): string => {
  const base = `https://www.facebook.com/marketplace/${locationSlug(request.location.label)}/`;
  return request.query.trim() === '' ? base : `${base}search/?query=${encodeURIComponent(request.query.trim())}`;
};

const graphListings = async (
  page: AuthenticatedResponse,
  request: ListingRequest,
): Promise<MarketplaceResult<ListingPage>> => {
  const context = await graphContextFrom(page);
  if (!context.ok) return context;
  const radiusKm = request.radius === null ? 805 : Math.round(request.radius * 1.609344);
  const buyLocation = {
    latitude: request.location.latitude,
    longitude: request.location.longitude,
  };
  const browseVariables = {
    buyLocation,
    count: 1,
    cursor: null,
    imageWidth: 256,
    mediaType: 'image/jpeg',
    radius: radiusKm * 1000,
    scale: 1,
    sizing: 'cover-fill-cropped',
    useSDFPath: true,
    __relay_internal__pv__CometMarketplaceShouldShowTopPicksStrikethroughrelayprovider: false,
    __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
    __relay_internal__pv__MarketplaceCometAdmodulerelayprovider: true,
    __relay_internal__pv__CometMarketplaceShouldShowFeedShippingIconrelayprovider: false,
  };
  const searchVariables = {
    buyLocation,
    contextual_data: null,
    count: 24,
    cursor: null,
    params: {
      bqf: { callsite: 'COMMERCE_MKTPLACE_WWW', query: request.query.trim() },
      browse_request_params: {
        commerce_enable_local_pickup: true,
        commerce_enable_shipping: true,
        commerce_search_and_rp_available: true,
        commerce_search_and_rp_condition: null,
        commerce_search_and_rp_ctime_days: null,
        filter_location_latitude: buyLocation.latitude,
        filter_location_longitude: buyLocation.longitude,
        filter_price_lower_bound: 0,
        filter_price_upper_bound: 214748364700,
        filter_radius_km: radiusKm,
      },
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
    },
    savedSearchID: null,
    savedSearchQuery: request.query.trim(),
    scale: 1,
    shouldDeferNonCritical: false,
    shouldIncludePopularSearches: true,
    topicPageParams: { location_id: null, url: null },
    __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
  };
  const searching = request.query.trim() !== '';
  const friendlyName = searching
    ? 'CometMarketplaceSearchContentContainerQuery'
    : 'MarketplaceCometBrowseFeedLightContainerQuery';
  const response = await graphRequest(context.value, {
    friendlyName,
    documentId: searching ? searchQueryDocumentId : browseQueryDocumentId,
    variables: searching ? searchVariables : browseVariables,
  });
  if (!response.ok) return response;
  const graphError = graphErrorMessage(response.value.body);
  if (graphError !== null) {
    return { ok: false, error: { tag: 'request_failed', message: `Facebook could not apply this filter: ${graphError}` } };
  }
  const seen = new Set<string>();
  const listings = [
    ...parseGraphListings(response.value.body),
    ...parseRawGraphListings(response.value.body),
    ...parseListings(response.value.body),
  ].filter((listing) => {
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
  return listings.length > 0
    ? { ok: true, value: { listings, nextCursor: nextCursorFrom(response.value.body) } }
    : { ok: false, error: { tag: 'response_changed', message: 'Facebook accepted the distance filter, but its result format could not be parsed.' } };
};

const listingPageAfter = async (
  context: GraphContext,
  request: ListingRequest,
  cursor: string,
): Promise<MarketplaceResult<ListingPage>> => {
  const searching = request.query.trim() !== '';
  const radiusKm = request.radius === null ? 805 : Math.round(request.radius * 1.609344);
  const buyLocation = {
    latitude: request.location.latitude,
    longitude: request.location.longitude,
  };
  const browseVariables = {
    buyLocation,
    count: 5,
    cursor,
    imageWidth: 256,
    includePDPRelevantListings: false,
    mediaType: 'image/jpeg',
    pdpListingId: '',
    radius: radiusKm * 1000,
    refinement: null,
    scale: 1,
    sizing: 'cover-fill-cropped',
    useSDFPath: true,
    __relay_internal__pv__CometMarketplaceShouldShowTopPicksStrikethroughrelayprovider: false,
    __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
    __relay_internal__pv__MarketplaceCometAdmodulerelayprovider: true,
    __relay_internal__pv__CometMarketplaceShouldShowFeedShippingIconrelayprovider: false,
  };
  const searchVariables = {
    count: 24,
    cursor,
    params: {
      bqf: { callsite: 'COMMERCE_MKTPLACE_WWW', query: request.query.trim() },
      browse_request_params: {
        commerce_enable_local_pickup: true,
        commerce_enable_shipping: true,
        commerce_search_and_rp_available: true,
        commerce_search_and_rp_category_id: [],
        commerce_search_and_rp_condition: null,
        commerce_search_and_rp_ctime_days: null,
        filter_location_latitude: buyLocation.latitude,
        filter_location_longitude: buyLocation.longitude,
        filter_price_lower_bound: 0,
        filter_price_upper_bound: 214748364700,
        filter_radius_km: radiusKm,
      },
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
    },
    scale: 1,
    __relay_internal__pv__GHLShouldChangeMarketplaceSponsoredDataFieldNamerelayprovider: true,
  };
  const response = await graphRequest(context, {
    friendlyName: searching
      ? 'CometMarketplaceSearchContentPaginationQuery'
      : 'MarketplaceCometBrowseFeedLightPaginationQuery',
    documentId: searching ? searchPaginationDocumentId : browsePaginationDocumentId,
    variables: searching ? searchVariables : browseVariables,
  });
  if (!response.ok) return response;
  const graphError = graphErrorMessage(response.value.body);
  if (graphError !== null) {
    return { ok: false, error: { tag: 'request_failed', message: `Facebook could not load more listings: ${graphError}` } };
  }
  const seen = new Set<string>();
  const listings = [
    ...parseGraphListings(response.value.body),
    ...parseRawGraphListings(response.value.body),
    ...parseListings(response.value.body),
  ].filter((listing) => {
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
  const nextCursor = nextCursorFrom(response.value.body);
  return {
    ok: true,
    value: {
      listings,
      nextCursor,
    },
  };
};

const moreListings = async (
  request: ListingRequest,
  cursor: string,
): Promise<MarketplaceResult<ListingPage>> => {
  const page = await authenticatedRequest(marketplaceUrl(request));
  if (!page.ok) return page;
  const context = await graphContextFrom(page.value);
  if (!context.ok) return context;
  return listingPageAfter(context.value, request, cursor);
};

const createSavedSearch = async (
  request: SavedSearchRequest,
): Promise<MarketplaceResult<FacebookSavedSearch>> => {
  if (request.filters.category !== null || request.filters.localPickupOnly) {
    return {
      ok: false,
      error: {
        tag: 'request_failed',
        message: 'Facebook alerts for category and local-pickup filters are not supported yet. Clear those filters and try again.',
      },
    };
  }
  const minPrice = priceInMinorUnits(request.filters.minPrice, 0);
  const maxPrice = priceInMinorUnits(request.filters.maxPrice, 214748364700);
  if (minPrice === null || maxPrice === null || minPrice > maxPrice) {
    return {
      ok: false,
      error: { tag: 'request_failed', message: 'Enter a valid price range before creating this Facebook alert.' },
    };
  }
  const page = await authenticatedRequest('https://www.facebook.com/marketplace/');
  if (!page.ok) return page;
  const context = await graphContextFrom(page.value);
  if (!context.ok) return context;
  const response = await graphRequest(context.value, {
    friendlyName: 'useCometMarketplaceCreateSavedSearchMutation',
    documentId: createSavedSearchDocumentId,
    variables: {
      input: {
        actor_id: context.value.userId,
        client_mutation_id: '1',
        latitude: request.filters.location.latitude,
        longitude: request.filters.location.longitude,
        max_price: maxPrice,
        min_price: minPrice,
        search_radius: request.filters.radius === null
          ? 805
          : Math.round(request.filters.radius * 1.609344),
        search_string: request.query.trim(),
        subscription_type: 'explicit',
      },
    },
  });
  if (!response.ok) return response;
  const savedSearch = createdSavedSearch(response.value.body);
  if (savedSearch !== null) return { ok: true, value: savedSearch };
  const graphError = graphErrorMessage(response.value.body);
  return {
    ok: false,
    error: {
      tag: graphError === null ? 'response_changed' : 'request_failed',
      message: graphError === null
        ? 'Facebook accepted the alert request, but did not return the saved alert.'
        : `Facebook could not create this alert: ${graphError}`,
    },
  };
};

const deleteSavedSearch = async (savedSearchId: string): Promise<MarketplaceResult<null>> => {
  const page = await authenticatedRequest('https://www.facebook.com/marketplace/');
  if (!page.ok) return page;
  const context = await graphContextFrom(page.value);
  if (!context.ok) return context;
  const response = await graphRequest(context.value, {
    friendlyName: 'useCometMarketplaceDeleteSavedSearchMutation',
    documentId: deleteSavedSearchDocumentId,
    variables: { input: { saved_search_id: savedSearchId } },
  });
  if (!response.ok) return response;
  if (deletedSavedSearchId(response.value.body) === savedSearchId) return { ok: true, value: null };
  const graphError = graphErrorMessage(response.value.body);
  return {
    ok: false,
    error: {
      tag: graphError === null ? 'response_changed' : 'request_failed',
      message: graphError === null
        ? 'Facebook did not confirm that the alert was removed. It remains saved in this app.'
        : `Facebook could not remove this alert: ${graphError}`,
    },
  };
};

const notifications = async (): Promise<MarketplaceResult<readonly MarketplaceNotification[]>> => {
  const page = await authenticatedRequest('https://www.facebook.com/marketplace/');
  if (!page.ok) return page;
  const context = await graphContextFrom(page.value);
  if (!context.ok) return context;
  const response = await graphRequest(context.value, {
    friendlyName: 'CometMarketplaceNotificationsListContainerQuery',
    documentId: notificationsQueryDocumentId,
    variables: { isCOBMOB: false, scale: 1 },
  });
  if (!response.ok) return response;
  const graphError = graphErrorMessage(response.value.body);
  if (graphError !== null) {
    return {
      ok: false,
      error: { tag: 'request_failed', message: `Facebook could not load Marketplace notifications: ${graphError}` },
    };
  }
  return { ok: true, value: marketplaceNotifications(response.value.body) };
};

export const FacebookMarketplace = {
  createSavedSearch,
  deleteSavedSearch,
  locations: async (query: string): Promise<MarketplaceResult<readonly MarketplaceLocationSuggestion[]>> => {
    if (query.trim().length < 2) return { ok: true, value: [] };
    const page = await authenticatedRequest('https://www.facebook.com/marketplace/');
    if (!page.ok) return page;
    const context = await graphContextFrom(page.value);
    return context.ok ? searchLocations(page.value, context.value, query) : context;
  },
  listings: async (request: ListingRequest): Promise<MarketplaceResult<ListingPage>> => {
    const page = await authenticatedRequest(marketplaceUrl(request));
    if (!page.ok) return page;
    return graphListings(page.value, request);
  },
  moreListings,
  detail: async (listingId: string): Promise<MarketplaceResult<ListingDetail>> => {
    const page = await authenticatedRequest(`https://www.facebook.com/marketplace/item/${listingId}/`);
    if (!page.ok) return page;
    const description = /"redacted_description":\{"text":"([^"]*)"\}/.exec(page.value.body);
    const seller = /"marketplace_listing_seller":\{[\s\S]{0,120}?"name":"([^"]+)"/.exec(page.value.body);
    const avatar = /"marketplace_listing_seller":\{[\s\S]{0,1000}?"profile_picture":\{"uri":"([^"]+)"/.exec(page.value.body);
    if (description === null && seller === null) {
      return { ok: false, error: { tag: 'listing_unavailable', message: 'This Facebook listing is no longer available.' } };
    }
    return {
      ok: true,
      value: {
        description: description?.[1] === undefined ? null : decodeJsonString(description[1]),
        sellerName: seller?.[1] === undefined ? null : decodeJsonString(seller[1]),
        sellerAvatarUrl: avatar?.[1] === undefined ? null : decodeJsonString(avatar[1]),
      },
    };
  },
  notifications,
} as const;
