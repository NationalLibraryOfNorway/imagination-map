import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useCorpus } from '../context/CorpusContext';
import './PlaceSummaryCard.css';

interface PlaceSummaryCardProps {
    token: string | null;
    placeId?: string | null;
    onClose: () => void;
}

interface PlaceBookDetail {
    dhlabid: number;
    urn: string;
    author: string | null;
    year: number | null;
    title: string | null;
    category: string | null;
    mentions: number;
}

interface ConcordanceHit {
    bookId: number;
    pos: number;
    frag: string;
}

function toGeoLookupId(placeId: string | null | undefined): string | null {
    if (!placeId) return null;
    const normalized = placeId.trim();
    if (!normalized) return null;
    const match = normalized.match(/^(geonames|internal):(.+)$/i);
    if (match && match[2]) return match[2];
    return normalized;
}

function buildGeoLookupCandidates(placeId: string | null | undefined): string[] {
    if (!placeId) return [];
    const raw = placeId.trim();
    if (!raw) return [];
    const stripped = toGeoLookupId(raw);
    const candidates = [stripped, raw].filter((value): value is string => Boolean(value && value.trim()));
    return Array.from(new Set(candidates));
}

function extractHits(data: any): ConcordanceHit[] {
    const renderedHits = (data?.rendered || []).map((row: any) => {
        const fragment = typeof row?.frag === 'string' ? row.frag : '';
        if (!fragment) return null;
        const bookId = Number(row?.bookId);
        const pos = Number(row?.pos ?? row?.seqStart ?? 0);
        if (!Number.isFinite(bookId)) return null;
        return { bookId, pos: Number.isFinite(pos) ? pos : 0, frag: `...${fragment}...` };
    }).filter((row: ConcordanceHit | null): row is ConcordanceHit => row !== null);

    if (renderedHits.length > 0) return renderedHits;

    return (data?.rows || []).map((row: any) => {
        const fragment = typeof row?.frag === 'string' ? row.frag : '';
        if (!fragment) return null;
        const bookId = Number(row?.bookId);
        const pos = Number(row?.pos ?? row?.seqStart ?? 0);
        if (!Number.isFinite(bookId)) return null;
        return { bookId, pos: Number.isFinite(pos) ? pos : 0, frag: `...${fragment}...` };
    }).filter((row: ConcordanceHit | null): row is ConcordanceHit => row !== null);
}

function uniqueHits(hits: ConcordanceHit[]): ConcordanceHit[] {
    const seen = new Set<string>();
    const unique: ConcordanceHit[] = [];
    hits.forEach((hit) => {
        const key = `${hit.bookId}:${hit.pos}:${hit.frag}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(hit);
    });
    return unique;
}

export const PlaceSummaryCard: React.FC<PlaceSummaryCardProps> = ({ token, placeId, onClose }) => {
    const { activeDhlabids, API_URL, activeWindow, setActiveWindow, places } = useCorpus();
    const [books, setBooks] = useState<PlaceBookDetail[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showConc, setShowConc] = useState(false);
    const [collapsedBooks, setCollapsedBooks] = useState<Record<number, boolean>>({});
    const [bookConcordances, setBookConcordances] = useState<Record<number, ConcordanceHit[]>>({});
    const [bookConcordanceLoading, setBookConcordanceLoading] = useState<Record<number, boolean>>({});
    const concordanceCacheRef = useRef<Map<string, ConcordanceHit[]>>(new Map());

    const effectivePlaceId = placeId || (token ? places.find((p) => p.token === token)?.id : undefined);
    const sortedBooks = useMemo(
        () => [...books].sort((a, b) => b.mentions - a.mentions),
        [books]
    );
    const booksById = useMemo(() => {
        const map = new Map<number, PlaceBookDetail>();
        books.forEach((book) => map.set(book.dhlabid, book));
        return map;
    }, [books]);
    const loadedConcordanceCount = useMemo(
        () => Object.values(bookConcordances).reduce((sum, rows) => sum + rows.length, 0),
        [bookConcordances]
    );

    useEffect(() => {
        if (!token || activeDhlabids.length === 0) {
            setBooks([]);
            setShowConc(false);
            setBookConcordances({});
            setBookConcordanceLoading({});
            return;
        }

        setIsLoading(true);
        setBooks([]);
        setShowConc(false);
        setBookConcordances({});
        setBookConcordanceLoading({});
        setCollapsedBooks({});
        fetch(`${API_URL}/api/places/details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dhlabids: activeDhlabids, token })
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch place details");
            return res.json();
        })
        .then(data => {
            setBooks(data.books || []);
            setIsLoading(false);
        })
        .catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    }, [token, activeDhlabids, API_URL]);

    const fetchConcordance = () => {
        if (!token) return;
        setShowConc(true);
    };

    const fetchBookConcordance = async (bookId: number) => {
        if (!token) return;
        const cacheKey = `${token}::${effectivePlaceId || ''}::${bookId}`;
        const cached = concordanceCacheRef.current.get(cacheKey);
        if (cached) {
            setBookConcordances((prev) => ({ ...prev, [bookId]: cached }));
            return;
        }

        setBookConcordanceLoading((prev) => ({ ...prev, [bookId]: true }));
        const geoLookupCandidates = buildGeoLookupCandidates(effectivePlaceId);

        try {
            let hits: ConcordanceHit[] = [];
            if (geoLookupCandidates.length > 0) {
                const candidateResults = await Promise.all(
                    geoLookupCandidates.map(async (candidateId) => {
                        try {
                            const res = await fetch(`${API_URL}/or_query`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    terms: [`#geo:${candidateId}`],
                                    window: 15,
                                    before: 15,
                                    after: 15,
                                    totalLimit: 40,
                                    renderHits: true,
                                    useFilter: true,
                                    filterIds: [bookId]
                                })
                            });
                            if (!res.ok) return [] as ConcordanceHit[];
                            const data = await res.json();
                            return extractHits(data);
                        } catch {
                            return [] as ConcordanceHit[];
                        }
                    })
                );
                hits = uniqueHits(candidateResults.flat());
            }

            if (hits.length === 0) {
                const res = await fetch(`${API_URL}/concordance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wordA: token,
                        window: 25,
                        before: 15,
                        after: 15,
                        perBook: 20,
                        totalLimit: 40,
                        useFilter: true,
                        filterIds: [bookId]
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    hits = uniqueHits(extractHits(data));
                }
            }

            concordanceCacheRef.current.set(cacheKey, hits);
            setBookConcordances((prev) => ({ ...prev, [bookId]: hits }));
        } catch (err) {
            console.error(err);
            setBookConcordances((prev) => ({ ...prev, [bookId]: [] }));
        } finally {
            setBookConcordanceLoading((prev) => ({ ...prev, [bookId]: false }));
        }
    };

    const downloadConcordanceExcel = () => {
        const rows = Object.entries(bookConcordances).flatMap(([bookIdRaw, hits]) => {
            const bookId = Number(bookIdRaw);
            const meta = booksById.get(bookId);
            return hits.map((hit) => ({
                dhlabid: bookId,
                forfatter: meta?.author || '',
                tittel: meta?.title || '',
                år: meta?.year ?? '',
                konk: hit.frag
            }));
        });
        if (rows.length === 0) return;

        const sheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Konkordanser');
        const stamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `stedskonkordans-${token || 'sted'}-${stamp}.xlsx`);
    };

    if (!token) return null;

    return (
        <div
            className="place-summary-card glassmorphism"
            style={{ zIndex: activeWindow === 'summary' ? 2600 : 2000 }}
            onMouseDown={() => setActiveWindow('summary')}
        >
            <div className="summary-header">
                <h3><i className="fas fa-map-marker-alt" style={{color: '#dc2626'}}></i> {token}</h3>
                <button onClick={onClose}><i className="fas fa-times"></i></button>
            </div>
            
            <div className="summary-body">
                {isLoading ? (
                    <div className="loading-state">
                        <i className="fas fa-circle-notch fa-spin"></i> Laster bøker for {token}...
                    </div>
                ) : (
                    <>
                        <div className="summary-stats">
                            <span>Forekomster: <strong>{books.reduce((sum, b) => sum + b.mentions, 0)}</strong></span>
                            <span>Unike bøker: <strong>{books.length}</strong></span>
                            <span>
                                {effectivePlaceId?.startsWith('geonames:')
                                    ? 'GeonameID'
                                    : effectivePlaceId?.startsWith('internal:')
                                        ? 'Intern-ID'
                                        : 'Steds-ID'}:{' '}
                                <strong>{effectivePlaceId || 'mangler i datasettet'}</strong>
                            </span>
                        </div>

                        <div className="concordance-section mt-2 mb-3">
                            <div className="concordance-toolbar">
                                <button 
                                    className="btn-op outline w-100" 
                                    onClick={showConc ? () => setShowConc(false) : fetchConcordance}
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    {showConc ? "Skjul eksempler" : "Se eksempler (Konkordans)"}
                                </button>
                                <button
                                    className="btn-op outline"
                                    onClick={downloadConcordanceExcel}
                                    style={{ fontSize: '0.8rem' }}
                                    disabled={loadedConcordanceCount === 0}
                                    title={loadedConcordanceCount === 0 ? 'Åpne minst én bok for å hente konkordans først' : 'Last ned Excel'}
                                >
                                    Last ned Excel
                                </button>
                            </div>
                            
                            {showConc && (
                                <div className="concordance-list mt-2">
                                    {sortedBooks.length > 0 ? (
                                        sortedBooks.map((book) => {
                                            const collapsed = collapsedBooks[book.dhlabid] ?? true;
                                            const hits = bookConcordances[book.dhlabid] || [];
                                            const isBookLoading = Boolean(bookConcordanceLoading[book.dhlabid]);
                                            const authorYear = `${book.author || 'Ukjent'}${book.year ? ` (${book.year})` : ''}`;
                                            return (
                                                <div key={book.dhlabid} className="concordance-group">
                                                    <button
                                                        type="button"
                                                        className="concordance-group-header"
                                                        onClick={() => {
                                                            const nextCollapsed = !collapsed;
                                                            setCollapsedBooks((prev) => ({
                                                                ...prev,
                                                                [book.dhlabid]: nextCollapsed
                                                            }));
                                                            if (!nextCollapsed && !bookConcordances[book.dhlabid] && !bookConcordanceLoading[book.dhlabid]) {
                                                                fetchBookConcordance(book.dhlabid);
                                                            }
                                                        }}
                                                    >
                                                        <span className="concordance-group-left">
                                                            <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-down'}`}></i>
                                                            <strong>{book.title || `Bok ${book.dhlabid}`}</strong>
                                                        </span>
                                                        <span className="concordance-group-right">
                                                            {book.mentions} forekomster
                                                            {!collapsed && !isBookLoading ? ` · ${hits.length} eksempler` : ''}
                                                        </span>
                                                    </button>
                                                    {!collapsed && (
                                                        <div className="concordance-group-body">
                                                            <div className="concordance-group-meta">{authorYear} · dhlabid {book.dhlabid}</div>
                                                            {isBookLoading ? (
                                                                <div className="text-center p-2"><i className="fas fa-spinner fa-spin"></i></div>
                                                            ) : hits.length > 0 ? (
                                                                hits.map((hit, i) => (
                                                                    <div
                                                                        key={`${book.dhlabid}:${hit.pos}:${i}`}
                                                                        className="concordance-item"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: hit.frag.replaceAll(token, `<mark>${token}</mark>`)
                                                                        }}
                                                                    />
                                                                ))
                                                            ) : (
                                                                <div className="text-muted small">Ingen teksteksempler for denne boka.</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-muted small">Ingen teksteksempler funnet.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <ul className="book-list">
                            {books.map(b => (
                                <li key={b.dhlabid} className="book-item">
                                    <div className="book-meta">
                                        <span className="book-author">{b.author || 'Ukjent'} ({b.year || '?'})</span>
                                        <span className="book-mentions">{b.mentions} treff</span>
                                    </div>
                                    <div className="book-title">{b.title || 'Uten tittel'}</div>
                                    {b.category && <div className="book-category">{b.category}</div>}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
};
