import type { BookMetadata } from '../context/CorpusContext';

interface FirstYearFetchParams {
  apiUrl: string;
  activeBooksMetadata: BookMetadata[];
  maxPlacesInView: number;
  totalPlaces: number;
}

const firstYearCache = new Map<string, Map<string, number>>();
const inflightFetches = new Map<string, Promise<Map<string, number>>>();

export function buildCorpusTemporalKey(activeBooksMetadata: BookMetadata[]): string {
  if (activeBooksMetadata.length === 0) return '';
  return activeBooksMetadata
    .map((book) => book.dhlabid)
    .sort((a, b) => a - b)
    .join(',');
}

export function hasFirstYearCacheForCorpus(activeBooksMetadata: BookMetadata[]): boolean {
  const corpusKey = buildCorpusTemporalKey(activeBooksMetadata);
  if (!corpusKey) return false;
  return firstYearCache.has(corpusKey);
}

export function isFirstYearFetchInFlight(activeBooksMetadata: BookMetadata[]): boolean {
  const corpusKey = buildCorpusTemporalKey(activeBooksMetadata);
  if (!corpusKey) return false;
  return inflightFetches.has(corpusKey);
}

export async function fetchFirstYearByTokenForCorpus({
  apiUrl,
  activeBooksMetadata,
  maxPlacesInView,
  totalPlaces
}: FirstYearFetchParams): Promise<Map<string, number>> {
  const corpusKey = buildCorpusTemporalKey(activeBooksMetadata);
  if (!corpusKey) return new Map();

  const cached = firstYearCache.get(corpusKey);
  if (cached) return cached;

  const inflight = inflightFetches.get(corpusKey);
  if (inflight) return inflight;

  const task = (async () => {
    const idsByYear = new Map<number, number[]>();
    activeBooksMetadata.forEach((book) => {
      if (book.year === null) return;
      const year = Number(book.year);
      if (!Number.isFinite(year)) return;
      if (!idsByYear.has(year)) idsByYear.set(year, []);
      idsByYear.get(year)?.push(book.dhlabid);
    });
    const sortedYears = Array.from(idsByYear.keys()).sort((a, b) => a - b);
    if (sortedYears.length === 0) return new Map<string, number>();

    const firstSeen = new Map<string, number>();
    for (const year of sortedYears) {
      const ids = idsByYear.get(year) || [];
      if (ids.length === 0) continue;
      const res = await fetch(`${apiUrl}/api/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dhlabids: ids, maxPlaces: Math.max(maxPlacesInView, totalPlaces) })
      });
      if (!res.ok) throw new Error('Failed first-year places fetch');
      const data = await res.json();
      const rows = (data.places || []) as Array<{ token: string }>;
      rows.forEach((row) => {
        if (!firstSeen.has(row.token)) firstSeen.set(row.token, year);
      });
    }

    return firstSeen;
  })();

  inflightFetches.set(corpusKey, task);
  try {
    const resolved = await task;
    firstYearCache.set(corpusKey, resolved);
    return resolved;
  } finally {
    inflightFetches.delete(corpusKey);
  }
}

