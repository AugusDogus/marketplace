const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const compressedAlphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
const runtimeModuleIds = [4246, 4318, 4890, 4947, 5269, 7026] as const;

export type CometRequestMetadata = {
  cometRequest: string;
  devicePixelRatio: string;
  dynamicModules: string;
  hasteSession: string;
  hsi: string;
  revision: string;
  routeName: string | null;
  spinTime: string;
};

export type CometRequestMetadataResult =
  | { ok: true; value: CometRequestMetadata }
  | { ok: false; message: string };

const gammaCode = (value: number): string => {
  const binary = value.toString(2);
  return `${'0'.repeat(binary.length - 1)}${binary}`;
};

const compressModuleIds = (moduleIds: ReadonlySet<number>): string => {
  const highestModuleId = Math.max(...moduleIds);
  let currentBit = moduleIds.has(0) ? 1 : 0;
  let runLength = 1;
  let binary = String(currentBit);
  for (let moduleId = 1; moduleId <= highestModuleId; moduleId += 1) {
    const bit = moduleIds.has(moduleId) ? 1 : 0;
    if (bit === currentBit) {
      runLength += 1;
      continue;
    }
    binary += gammaCode(runLength);
    currentBit = bit;
    runLength = 1;
  }
  binary += gammaCode(runLength);
  const padded = `${binary}00000`;
  let compressed = '';
  for (let index = 0; index + 6 <= padded.length; index += 6) {
    compressed += compressedAlphabet.charAt(Number.parseInt(padded.slice(index, index + 6), 2));
  }
  return compressed;
};

const scriptPayloads = (source: string): unknown[] => {
  const payloads: unknown[] = [];
  for (const match of source.matchAll(/<script[^>]*data-sjs>([\s\S]*?)<\/script>/g)) {
    const text = match[1];
    if (text === undefined) continue;
    try {
      payloads.push(JSON.parse(text));
    } catch {
      continue;
    }
  }
  return payloads;
};

const moduleDataFrom = (value: unknown, moduleName: string, depth = 0): Record<string, unknown> | null => {
  if (depth > 20) return null;
  if (Array.isArray(value)) {
    if (value[0] === moduleName && isRecord(value[2])) return value[2];
    for (const child of value) {
      const found = moduleDataFrom(child, moduleName, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  for (const child of Object.values(value)) {
    const found = moduleDataFrom(child, moduleName, depth + 1);
    if (found !== null) return found;
  }
  return null;
};

const spinTimeFrom = (value: unknown, depth = 0): number | null => {
  if (depth > 20) return null;
  if (Array.isArray(value)) {
    if (value[0] === 'bootstrapWebSession' && Array.isArray(value[3]) && typeof value[3][0] === 'number') {
      return value[3][0];
    }
    for (const child of value) {
      const found = spinTimeFrom(child, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  for (const child of Object.values(value)) {
    const found = spinTimeFrom(child, depth + 1);
    if (found !== null) return found;
  }
  return null;
};

const addScheduledModuleIds = (value: unknown, moduleIds: Set<number>): void => {
  if (!isRecord(value) || !Array.isArray(value.require)) return;
  for (const call of value.require) {
    if (!Array.isArray(call) || call[0] !== 'ScheduledServerJS' || !Array.isArray(call[3])) continue;
    for (const box of call[3]) {
      if (!isRecord(box) || !isRecord(box.__bbox) || !Array.isArray(box.__bbox.define)) continue;
      for (const definition of box.__bbox.define) {
        if (!Array.isArray(definition) || typeof definition[3] !== 'number' || definition[3] === -1) continue;
        moduleIds.add(definition[3]);
      }
    }
  }
};

const firstCapture = (source: string, pattern: RegExp): string | null => pattern.exec(source)?.[1] ?? null;

export const CometRequestMetadata = {
  fromHtml: (source: string): CometRequestMetadataResult => {
    const payloads = scriptPayloads(source);
    let siteData: Record<string, unknown> | null = null;
    let spinTime: number | null = null;
    const moduleIds = new Set<number>(runtimeModuleIds);
    for (const payload of payloads) {
      siteData ??= moduleDataFrom(payload, 'SiteData');
      spinTime ??= spinTimeFrom(payload);
      addScheduledModuleIds(payload, moduleIds);
    }
    if (
      siteData === null ||
      typeof siteData.client_revision !== 'number' ||
      typeof siteData.haste_session !== 'string' ||
      typeof siteData.hsi !== 'string' ||
      typeof siteData.comet_env !== 'number' ||
      typeof siteData.pr !== 'number' ||
      spinTime === null ||
      moduleIds.size === runtimeModuleIds.length
    ) {
      return {
        ok: false,
        message: 'Facebook could not finish loading Marketplace. Try again. If the problem continues, log out and sign in again.',
      };
    }
    return {
      ok: true,
      value: {
        cometRequest: String(siteData.comet_env),
        devicePixelRatio: String(siteData.pr),
        dynamicModules: compressModuleIds(moduleIds),
        hasteSession: siteData.haste_session,
        hsi: siteData.hsi,
        revision: String(siteData.client_revision),
        routeName: firstCapture(source, /"canonicalRouteName":"([^"]+)"/),
        spinTime: String(spinTime),
      },
    };
  },
} as const;
