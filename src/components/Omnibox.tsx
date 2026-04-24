import { useEffect, useMemo, useState } from 'react';
import { useCorpus } from '../context/CorpusContext';
import './Omnibox.css';

interface OmniboxProps {
  onSelectPlace: (place: { token: string; placeId?: string }) => void;
}

interface AuthorMatch {
  name: string;
  count: number;
  dhlabids: number[];
}

interface ResolvedPlaceMatch {
  id: string;
  canonicalName: string;
  matchedForm?: string | null;
  alternateForms?: string[];
  country?: string | null;
  lat?: number | null;
  lon?: number | null;
  matchType?: string | null;
}

function tokenize(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function hasAllTokens(value: string | null | undefined, tokens: string[]): boolean {
  if (!value) return false;
  const lowered = value.toLowerCase();
  return tokens.every((token) => lowered.includes(token));
}

function splitAuthors(raw: string): string[] {
  return raw
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

export const Omnibox: React.FC<OmniboxProps> = ({ onSelectPlace }) => {
  const { allBooks, activeDhlabids, setActiveDhlabids, places, API_URL } = useCorpus();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [globalPlaceResults, setGlobalPlaceResults] = useState<ResolvedPlaceMatch[]>([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);

  const authorIndex = useMemo(() => {
    const byAuthor = new Map<string, Set<number>>();
    for (const book of allBooks) {
      if (!book.author) continue;
      for (const author of splitAuthors(book.author)) {
        if (!byAuthor.has(author)) byAuthor.set(author, new Set<number>());
        byAuthor.get(author)?.add(book.dhlabid);
      }
    }
    return byAuthor;
  }, [allBooks]);

  const activePlaceById = useMemo(() => {
    const byId = new Map<string, typeof places[number]>();
    places.forEach((place) => {
      byId.set(String(place.id), place);
    });
    return byId;
  }, [places]);

  const results = useMemo(() => {
    const term = submittedQuery.trim();
    if (term.length < 2) {
      return { books: [], authors: [] };
    }
    const tokens = tokenize(term);

    const books = allBooks
      .filter((book) => hasAllTokens(book.title, tokens))
      .sort((a, b) => {
        const aExact = (a.title || '').toLowerCase() === term.toLowerCase();
        const bExact = (b.title || '').toLowerCase() === term.toLowerCase();
        if (aExact !== bExact) return aExact ? -1 : 1;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 6);

    const authors: AuthorMatch[] = Array.from(authorIndex.entries())
      .filter(([author]) => hasAllTokens(author, tokens))
      .map(([name, ids]) => ({
        name,
        count: ids.size,
        dhlabids: Array.from(ids)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { books, authors };
  }, [submittedQuery, allBooks, authorIndex]);

  useEffect(() => {
    const term = submittedQuery.trim();
    if (term.length < 2) {
      setGlobalPlaceResults([]);
      setIsPlacesLoading(false);
      return;
    }

    let cancelled = false;
    setIsPlacesLoading(true);

    fetch(`${API_URL}/api/place/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: term,
        limit: 6
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ matches?: ResolvedPlaceMatch[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setGlobalPlaceResults(Array.isArray(data?.matches) ? data.matches : []);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Could not resolve places for omnibox', error);
        setGlobalPlaceResults([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [API_URL, submittedQuery]);

  const runSearch = () => {
    const term = query.trim();
    if (term.length < 2) {
      setIsOpen(false);
      return;
    }
    setSubmittedQuery(term);
    setIsOpen(true);
  };

  const addBookToCorpus = (dhlabid: number) => {
    setActiveDhlabids(Array.from(new Set([...activeDhlabids, dhlabid])));
  };

  const addAuthorToCorpus = (dhlabids: number[]) => {
    setActiveDhlabids(Array.from(new Set([...activeDhlabids, ...dhlabids])));
  };

  const hasAnyResults = results.books.length > 0 || results.authors.length > 0 || globalPlaceResults.length > 0;

  return (
    <div className="omnibox-container">
      <div className="omnibox-input-row">
        <i className="fas fa-search" aria-hidden="true"></i>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch();
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder="Søk i steder, bøker, forfattere..."
        />
        <button onClick={runSearch}>Søk</button>
      </div>

      {isOpen && (
        <div className="omnibox-results">
          <div className="omnibox-header">
            <span>Søketreff</span>
            <button onClick={() => setIsOpen(false)}>Lukk</button>
          </div>

          {!hasAnyResults && <div className="omnibox-empty">Ingen treff for "{submittedQuery}".</div>}

          {(isPlacesLoading || globalPlaceResults.length > 0) && (
            <section>
              <h4>Steder</h4>
              {isPlacesLoading && <div className="omnibox-empty">Søker i alle steder...</div>}
              {!isPlacesLoading && globalPlaceResults.map((place) => {
                const placeInActiveCorpus = activePlaceById.get(String(place.id));
                return (
                  <div key={place.id} className="omnibox-row">
                    <div>
                      <strong>{place.matchedForm || place.canonicalName}</strong>
                      <small>
                        {place.canonicalName !== (place.matchedForm || place.canonicalName) ? `${place.canonicalName} · ` : ''}
                        {place.country || 'ukjent land'}
                        {placeInActiveCorpus
                          ? ` · ${placeInActiveCorpus.frequency.toLocaleString()} treff i ${placeInActiveCorpus.doc_count.toLocaleString()} bøker i aktivt korpus`
                          : ' · globalt stedstreff'}
                      </small>
                    </div>
                    <button
                      onClick={() => {
                        onSelectPlace({
                          token: place.matchedForm || place.canonicalName,
                          placeId: place.id
                        });
                        setIsOpen(false);
                      }}
                    >
                      Vis i kart
                    </button>
                  </div>
                );
              })}
            </section>
          )}

          {results.books.length > 0 && (
            <section>
              <h4>Bøker</h4>
              {results.books.map((book) => (
                <div key={book.dhlabid} className="omnibox-row">
                  <div>
                    <strong>{book.title || 'Uten tittel'}</strong>
                    <small>
                      {book.author || 'Ukjent'} {book.year ? `(${book.year})` : ''}
                    </small>
                  </div>
                  <button onClick={() => addBookToCorpus(book.dhlabid)}>Legg til korpus</button>
                </div>
              ))}
            </section>
          )}

          {results.authors.length > 0 && (
            <section>
              <h4>Forfattere</h4>
              {results.authors.map((author) => (
                <div key={author.name} className="omnibox-row">
                  <div>
                    <strong>{author.name}</strong>
                    <small>{author.count.toLocaleString()} bøker</small>
                  </div>
                  <button onClick={() => addAuthorToCorpus(author.dhlabids)}>Legg bøker til korpus</button>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
