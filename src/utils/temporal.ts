import type { BookMetadata } from '../context/CorpusContext';

interface FirstYearFetchParams {
  apiUrl: string;
  activeBooksMetadata: BookMetadata[];
  targetPlaceIds?: string[];
}

const firstYearCache = new Map<string, Map<string, number>>();
const inflightFetches = new Map<string, Promise<Map<string, number>>>();

const normalizePlaceId = (placeId: string): string => placeId.trim().toLowerCase();

const normalizeFirstYearRow = (row: any): { placeId: string; year: number } | null => {
  const placeIdRaw = row?.place_id ?? row?.placeId ?? row?.id ?? row?.nb_place_id;
  const yearRaw = row?.year ?? row?.first_year ?? row?.firstYear;
  const placeId = normalizePlaceId(String(placeIdRaw ?? ''));
  const year = Number(yearRaw);
  if (!placeId || !/^\d+$/.test(placeId) || !Number.isFinite(year)) return null;
  return { placeId, year: Math.round(year) };
};

const filterFirstYearMap = (input: Map<string, number>, targetPlaceIds?: string[]): Map<string, number> => {
  if (!targetPlaceIds || targetPlaceIds.length === 0) return input;
  const allowed = new Set(targetPlaceIds.map(normalizePlaceId).filter(Boolean));
  const out = new Map<string, number>();
  allowed.forEach((placeId) => {
    const year = input.get(placeId);
    if (typeof year === 'number') out.set(placeId, year);
  });
  return out;
};

export function buildCorpusTemporalKey(activeBooksMetadata: BookMetadata[]): string {
  if (activeBooksMetadata.length === 0) return '';
  return activeBooksMetadata
    .map((book) => book.dhlabid)
    .sort((a, b) => a - b)
    .join(',');
}

export function hasFirstYearCacheForCorpus(activeBooksMetadata: BookMetadata[], _targetPlaceIds?: string[]): boolean {
  const corpusKey = buildCorpusTemporalKey(activeBooksMetadata);
  if (!corpusKey) return false;
  return firstYearCache.has(corpusKey);
}

export function getFirstYearCacheForCorpus(activeBooksMetadata: BookMetadata[], targetPlaceIds?: string[]): Map<string, number> | null {
  const corpusKey = buildCorpusTemporalKey(activeBooksMetadata);
  if (!corpusKey) return null;
  const cached = firstYearCache.get(corpusKey);
  if (!cached) return null;
  return filterFirstYearMap(cached, targetPlaceIds);
}

export function isFirstYearFetchInFlight(activeBooksMetadata: BookMetadata[], _targetPlaceIds?: string[]): boolean {
  const corpusKey = buildCorpusTemporalKey(activeBooksMetadata);
  if (!corpusKey) return false;
  return inflightFetches.has(corpusKey);
}

export async function fetchFirstYearByTokenForCorpus({
  apiUrl,
  activeBooksMetadata,
  targetPlaceIds
}: FirstYearFetchParams): Promise<Map<string, number>> {
  const corpusKey = buildCorpusTemporalKey(activeBooksMetadata);
  if (!corpusKey) return new Map();

  const activeDhlabids = activeBooksMetadata.map((book) => book.dhlabid);
  const cached = firstYearCache.get(corpusKey);
  if (cached) return filterFirstYearMap(cached, targetPlaceIds);

  const inflight = inflightFetches.get(corpusKey);
  if (inflight) {
    const resolved = await inflight;
    return filterFirstYearMap(resolved, targetPlaceIds);
  }

  const task = (async () => {
    const res = await fetch(`${apiUrl}/api/places/first-year`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dhlabids: activeDhlabids })
    });
    if (!res.ok) throw new Error('Failed first-year places fetch');
    const data = await res.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const firstSeen = new Map<string, number>();
    rows.forEach((row: any) => {
      const normalized = normalizeFirstYearRow(row);
      if (!normalized) return;
      const existing = firstSeen.get(normalized.placeId);
      if (typeof existing !== 'number' || normalized.year < existing) {
        firstSeen.set(normalized.placeId, normalized.year);
      }
    });
    return firstSeen;
  })();

  inflightFetches.set(corpusKey, task);
  try {
    const resolved = await task;
    firstYearCache.set(corpusKey, resolved);
    return filterFirstYearMap(resolved, targetPlaceIds);
  } finally {
    inflightFetches.delete(corpusKey);
  }
}

