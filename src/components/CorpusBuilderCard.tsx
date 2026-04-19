import React, { useState, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import Select from 'react-select';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import * as XLSX from 'xlsx';
import { useCorpus } from '../context/CorpusContext';
import { useWindowLayout } from '../utils/windowLayout';
import './CorpusBuilderCard.css';

export const CorpusBuilderCard: React.FC = () => {
    const {
        allBooks,
        setActiveDhlabids,
        activeDhlabids,
        isCorpusBuilderOpen,
        setIsCorpusBuilderOpen,
        activeWindow,
        setActiveWindow,
        API_URL
    } = useCorpus();
    // Form states
    const [yearRange, setYearRange] = useState<[number, number]>([1814, 1905]);
    const [selectedCategories, setSelectedCategories] = useState<{label: string, value: string}[]>([]);
    const [selectedAuthors, setSelectedAuthors] = useState<{label: string, value: string}[]>([]);
    const [selectedTitles, setSelectedTitles] = useState<{label: string, value: string}[]>([]);
    const [keywords, setKeywords] = useState<string>('');
    const [contentOperator, setContentOperator] = useState<'AND' | 'OR'>('OR');
    const [operationMode, setOperationMode] = useState<'set' | 'add' | 'intersect' | 'remove'>('set');
    const [isKeywordSearching, setIsKeywordSearching] = useState(false);
    const { layout, onDrag, onDragStop, onResizeStop } = useWindowLayout({
        key: 'builder',
        defaultLayout: { x: 30, y: 30, width: 360, height: 620 },
        minWidth: 300,
        minHeight: 360
    });

    // Dynamically calculate options based on allBooks AND mutually exclusive active filters
    const options = useMemo(() => {
        const categories = new Set<string>();
        const authors = new Set<string>();
        const titles = new Set<string>();
        
        const catFilterSet = new Set(selectedCategories.map(c => c.value));
        const authFilterSet = new Set(selectedAuthors.map(a => a.value));
        const titleFilterSet = new Set(selectedTitles.map(t => t.value));

        const inYearRange = (year: number | null) => year !== null && year >= yearRange[0] && year <= yearRange[1];

        allBooks.forEach(b => {
            // First pass: does the book even fall inside the visual slider?
            if (!inYearRange(b.year)) return;

            // Check if the book passes each individual constraint
            const catOk = catFilterSet.size === 0 || (b.category && catFilterSet.has(b.category));
            const authOk = authFilterSet.size === 0 || (b.author && authFilterSet.has(b.author));
            const titleOk = titleFilterSet.size === 0 || (b.title && titleFilterSet.has(b.title));

            // Populate options: A dropdown option is available if the book passes ALL *other* constraints
            if (authOk && titleOk && b.category) categories.add(b.category);
            
            if (catOk && titleOk && b.author) authors.add(b.author);
            
            if (catOk && authOk && b.title) titles.add(b.title);
        });

        return {
            categories: Array.from(categories).sort().map(c => ({value: c, label: c})),
            authors: Array.from(authors).sort().map(a => ({value: a, label: a})),
            titles: Array.from(titles).sort().map(t => ({value: t, label: t}))
        };
    }, [allBooks, yearRange, selectedCategories, selectedAuthors, selectedTitles]);

    const runBackendCorpusBuild = async (): Promise<number[] | null> => {
        const terms = keywords.split(',').map((k) => k.trim()).filter(Boolean);
        const categorySet = new Set(selectedCategories.map((c) => c.value));
        const authorSet = new Set(selectedAuthors.map((a) => a.value));
        const titleSet = new Set(selectedTitles.map((t) => t.value));
        const metadataIds = Array.from(
            new Set(
                allBooks
                    .filter((book) => {
                        if (book.year === null || book.year < yearRange[0] || book.year > yearRange[1]) return false;
                        if (categorySet.size > 0 && (!book.category || !categorySet.has(book.category))) return false;
                        if (authorSet.size > 0 && (!book.author || !authorSet.has(book.author))) return false;
                        if (titleSet.size > 0 && (!book.title || !titleSet.has(book.title))) return false;
                        return true;
                    })
                    .map((book) => book.dhlabid)
            )
        );

        if (terms.length === 0) {
            return metadataIds;
        }
        if (metadataIds.length === 0) {
            return [];
        }

        setIsKeywordSearching(true);
        try {
            const payload: Record<string, unknown> = {
                filters: {},
                baseCorpus: metadataIds,
                contentKeywords: terms,
                contentOperator
            };

            const response = await fetch(`${API_URL}/api/corpus/build`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Corpus build content filter failed");

            const data = await response.json();
            const candidates: unknown[] = Array.isArray(data?.dhlabids)
                ? data.dhlabids
                : Array.isArray(data?.corpus)
                    ? data.corpus
                    : Array.isArray(data?.ids)
                        ? data.ids
                        : Array.isArray(data?.bookIds)
                            ? data.bookIds
                            : [];
            const bookObjectIds = Array.isArray(data?.books)
                ? data.books.map((row: any) => row?.dhlabid ?? row?.bookId ?? row?.id)
                : [];
            const foundIds = Array.from(
                new Set(
                    [...candidates, ...bookObjectIds]
                        .map((id) => Number(id))
                        .filter((id) => Number.isFinite(id))
                )
            ) as number[];

            return foundIds;
        } catch (err) {
            console.error(err);
            alert("Feil ved søk i innhold. Sjekk tilkoblingen til API.");
            return null;
        } finally {
            setIsKeywordSearching(false);
        }
    };

    const handleApplyFilters = async () => {
        const foundIds = await runBackendCorpusBuild();
        if (!foundIds) return;
        if (foundIds.length === 0) {
            alert("Ingen treff for valgte filtre.");
        }
        applyIdsWithMode(foundIds);
    };

    const applyIdsWithMode = (incomingIds: number[]) => {
        if (operationMode === 'set') {
            setActiveDhlabids(Array.from(new Set(incomingIds)));
            return;
        }
        if (operationMode === 'add') {
            const added = new Set([...activeDhlabids, ...incomingIds]);
            setActiveDhlabids(Array.from(added));
            return;
        }
        if (operationMode === 'intersect') {
            const currentSet = new Set(activeDhlabids);
            const intersected = incomingIds.filter((id) => currentSet.has(id));
            setActiveDhlabids(intersected);
            return;
        }
        const removeSet = new Set(incomingIds);
        const remaining = activeDhlabids.filter((id) => !removeSet.has(id));
        setActiveDhlabids(remaining);
    };

    const handleClear = () => {
        setYearRange([1814, 1905]);
        setSelectedCategories([]);
        setSelectedAuthors([]);
        setSelectedTitles([]);
    };

    const importCorpus = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputEl = e.currentTarget;
        const normalizeKey = (key: string) =>
            key
                .toLowerCase()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');
        const parseIdValue = (value: unknown): number | null => {
            if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (!trimmed) return null;
                const asNumber = Number(trimmed);
                if (Number.isFinite(asNumber)) return Math.trunc(asNumber);
            }
            return null;
        };
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const candidateKeys = new Set([
                    'dhlabid',
                    'bookid',
                    'bokid'
                ]);

                // Scan all sheets, so Geo-konk workbooks can be imported directly.
                const idsSet = new Set<number>();
                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    if (!worksheet) return;
                    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });
                    rows.forEach((row) => {
                        Object.entries(row).forEach(([rawKey, rawValue]) => {
                            if (!candidateKeys.has(normalizeKey(rawKey))) return;
                            const id = parseIdValue(rawValue);
                            if (id !== null) idsSet.add(id);
                        });
                    });
                });

                const ids = Array.from(idsSet);
                if (ids.length > 0) {
                    setActiveDhlabids(ids);
                } else {
                    console.warn("Fant ingen dhlabid/bookId-kolonne i opplastet Excel-fil.");
                    alert("Fant ingen dhlabid i Excel-filen. Forventet kolonner som dhlabid eller bookId.");
                }
            } catch (err) {
                console.error("Invalid Excel corpus", err);
                alert("Klarte ikke å lese Excel-filen.");
            } finally {
                // Allow re-importing the same file without changing filename.
                inputEl.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    if (!isCorpusBuilderOpen) return null;

    return (
        <Rnd
            size={{ width: layout.width, height: layout.height }}
            position={{ x: layout.x, y: layout.y }}
            minWidth={300}
            minHeight={360}
            cancel=".no-drag"
            dragHandleClassName="drag-handle"
            className="corpus-builder-card"
            style={{ zIndex: activeWindow === 'builder' ? 2600 : 1700 }}
            onDragStart={() => setActiveWindow('builder')}
            onDrag={onDrag}
            onResizeStart={() => setActiveWindow('builder')}
            onDragStop={onDragStop}
            onResizeStop={onResizeStop}
        >
            <div className="corpus-builder-shell">
            <div className="card-header drag-handle" onMouseDown={() => setActiveWindow('builder')}>
                <div className="card-title">
                    <i className="fas fa-tools"></i> Corpus Builder
                </div>
                <div className="card-controls no-drag">
                    <button onClick={() => setIsCorpusBuilderOpen(false)} title="Minimer til chip">
                        <i className="fas fa-window-minimize"></i>
                    </button>
                </div>
            </div>

            <div className="card-body no-drag">
                    <div className="toolbar mb-2">
                        <button className="btn-text" onClick={handleClear}>Tøm alle filtre</button>
                        <button className="btn-text danger" onClick={() => setActiveDhlabids([])}>
                            Nullstill korpus <i className="fas fa-trash-alt ms-1"></i>
                        </button>
                    </div>

                    <div className="form-group mb-3">
                        <label>Årsspenn ({yearRange[0]} - {yearRange[1]})</label>
                        <div style={{ padding: '0 8px' }}>
                            <Slider 
                                range 
                                min={1800} 
                                max={1905} 
                                value={yearRange} 
                                onChange={(val) => setYearRange(val as [number, number])} 
                                trackStyle={[{ backgroundColor: '#4B6CB7' }]}
                                handleStyle={[{ borderColor: '#4B6CB7', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }, { borderColor: '#4B6CB7', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }]}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Metadata</label>
                        <Select 
                            isMulti 
                            options={options.categories} 
                            value={selectedCategories}
                            onChange={(val) => setSelectedCategories(val as any)}
                            placeholder="Kategorier..."
                            className="react-select-container mt-1"
                            classNamePrefix="react-select"
                        />
                        <Select 
                            isMulti 
                            options={options.authors} 
                            value={selectedAuthors}
                            onChange={(val) => setSelectedAuthors(val as any)}
                            placeholder="Forfattere..."
                            className="react-select-container mt-2"
                            classNamePrefix="react-select"
                        />
                        <Select 
                            isMulti 
                            options={options.titles} 
                            value={selectedTitles}
                            onChange={(val) => setSelectedTitles(val as any)}
                            placeholder="Titler..."
                            className="react-select-container mt-2 mb-2"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="form-group mt-3">
                        <label>Innholdsfilter (Nøkkelord)</label>
                        <div className="content-filter-row">
                            <div className="btn-group" role="group" aria-label="Innholdsoperator">
                                <button
                                    type="button"
                                    className={`btn-op outline ${contentOperator === 'AND' ? 'active' : ''}`}
                                    onClick={() => setContentOperator('AND')}
                                    title="Alle ord må finnes"
                                >
                                    AND
                                </button>
                                <button
                                    type="button"
                                    className={`btn-op outline ${contentOperator === 'OR' ? 'active' : ''}`}
                                    onClick={() => setContentOperator('OR')}
                                    title="Minst ett ord må finnes"
                                >
                                    OR
                                </button>
                            </div>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="f.eks krig, fred" 
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
                            />
                        </div>
                    </div>

                    <div className="action-row mt-3">
                        <div className="btn-group">
                            <button className={`btn-op outline ${operationMode === 'set' ? 'active' : ''}`} onClick={() => setOperationMode('set')} title="Erstatt aktivt korpus med treff">=</button>
                            <button className={`btn-op outline ${operationMode === 'add' ? 'active' : ''}`} onClick={() => setOperationMode('add')} title="Legg til treff i aktivt korpus">+</button>
                            <button className={`btn-op outline ${operationMode === 'intersect' ? 'active' : ''}`} onClick={() => setOperationMode('intersect')} title="Behold kun overlap mellom aktivt korpus og treff">&#38;</button>
                            <button className={`btn-op outline ${operationMode === 'remove' ? 'active' : ''}`} onClick={() => setOperationMode('remove')} title="Fjern treff fra aktivt korpus">-</button>
                        </div>
                        <button
                            className="btn-primary flex-grow-1"
                            onClick={handleApplyFilters}
                            disabled={isKeywordSearching}
                            title="Kjør metadata + ev. innholdsord i ett backend-kall"
                        >
                            {isKeywordSearching ? (
                                <>
                                    <i className="fas fa-sync-alt fa-spin me-2"></i> Søker...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sync-alt me-2"></i> Filter
                                </>
                            )}
                        </button>
                    </div>
                    <div className="form-group mt-2">
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            Metadata filteres lokalt, innholdsord kjøres via /api/corpus/build ({contentOperator}) på filtrerte ID-er.
                        </small>
                    </div>

                    <div className="action-row mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <label className="btn-op outline flex-grow-1" style={{ fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', padding: '6px' }} title="Last opp regneark for modifisering">
                            <i className="fas fa-file-upload"></i> Import
                            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={importCorpus} />
                        </label>
                    </div>
            </div>
            </div>
        </Rnd>
    );
};
