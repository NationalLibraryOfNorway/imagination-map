import React, { useMemo, useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useCorpus, type BookMetadata } from '../context/CorpusContext';
import { downloadCsv } from '../utils/download';
import { useWindowLayout } from '../utils/windowLayout';
import './CorpusBrowseTable.css';

type SortKey = keyof BookMetadata;

interface CorpusBrowseTableProps {
    onShowBookSequence?: (bookId: number) => void;
}

export const CorpusBrowseTable: React.FC<CorpusBrowseTableProps> = ({ onShowBookSequence }) => {
    const {
        activeBooksMetadata,
        isBrowseTableOpen,
        setIsBrowseTableOpen,
        activeWindow,
        setActiveWindow,
        bookSegmentAssignments,
        setBookSegmentAssignment,
        clearBookSegmentAssignments
    } = useCorpus();
    const [sortKey, setSortKey] = useState<SortKey>('author');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const { layout, onDragStop, onResizeStop } = useWindowLayout({
        key: 'browse',
        defaultLayout: { x: 50, y: 50, width: 800, height: 500 },
        minWidth: 400,
        minHeight: 300
    });

    const handleDownload = () => {
        const rows = sortedBooks.map((b) => ([
            b.urn.replace('URN:NBN:no-nb_digibok_', ''),
            b.author || '',
            b.year ?? '',
            b.title || '',
            b.category || '',
            b.unique_places ?? 0,
            b.total_mentions ?? 0,
            b.dhlabid
        ]));
        downloadCsv(
            `imagination_korpus_${sortedBooks.length}_boker.csv`,
            ['URN', 'Forfatter', 'År', 'Tittel', 'Kategori', 'Antall steder', 'Antall mentions', 'dhlabid'],
            rows
        );
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    // Dynamisk sortering
    const sortedBooks = useMemo(() => {
        return [...activeBooksMetadata].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            let comparison = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            } else {
                comparison = String(valA).localeCompare(String(valB));
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [activeBooksMetadata, sortKey, sortOrder]);

    useEffect(() => {
        const available = new Set(activeBooksMetadata.map((book) => book.dhlabid));
        Object.keys(bookSegmentAssignments).forEach((rawId) => {
            const id = Number(rawId);
            if (!Number.isFinite(id) || !available.has(id)) {
                setBookSegmentAssignment(id, 'none');
            }
        });
    }, [activeBooksMetadata, bookSegmentAssignments, setBookSegmentAssignment]);

    const aCount = useMemo(
        () => sortedBooks.filter((book) => bookSegmentAssignments[book.dhlabid] === 'A').length,
        [sortedBooks, bookSegmentAssignments]
    );
    const bCount = useMemo(
        () => sortedBooks.filter((book) => bookSegmentAssignments[book.dhlabid] === 'B').length,
        [sortedBooks, bookSegmentAssignments]
    );

    if (!isBrowseTableOpen) return null;

    const renderHeader = (label: string, key: SortKey) => (
        <th onClick={() => handleSort(key)} className="sortable-header">
            {label} {sortKey === key ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </th>
    );

    return (
        <Rnd
            size={{ width: layout.width, height: layout.height }}
            position={{ x: layout.x, y: layout.y }}
            minWidth={400}
            minHeight={300}
            cancel=".no-drag"
            dragHandleClassName="drag-handle"
            className="corpus-browse-table-rnd"
            style={{ zIndex: activeWindow === 'browse' ? 2600 : 1700 }}
            onDragStart={() => setActiveWindow('browse')}
            onResizeStart={() => setActiveWindow('browse')}
            onDragStop={onDragStop}
            onResizeStop={onResizeStop}
        >
            <div className="table-card glassmorphism">
                <div className="table-header drag-handle" onMouseDown={() => setActiveWindow('browse')}>
                    <div className="table-title">
                        <i className="fas fa-list"></i> Aktivt Korpus ({activeBooksMetadata.length} bøker)
                    </div>
                    <div className="table-controls no-drag">
                        <button onClick={handleDownload} title="Last ned korpusliste (CSV)">
                            <i className="fas fa-download"></i>
                        </button>
                        <button onClick={() => setIsBrowseTableOpen(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div className="table-body no-drag">
                    <div className="table-selection-toolbar">
                        <small className="text-muted">A: {aCount} | B: {bCount}</small>
                        <div className="table-selection-actions">
                            <button className="btn-text" type="button" onClick={clearBookSegmentAssignments}>
                                Nullstill A/B
                            </button>
                        </div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th className="segment-column">Seg</th>
                                    {renderHeader('URN', 'urn')}
                                    {renderHeader('Forfatter', 'author')}
                                    {renderHeader('År', 'year')}
                                    {renderHeader('Tittel', 'title')}
                                    {renderHeader('Kategori', 'category')}
                                    {renderHeader('Steder', 'unique_places')}
                                    {renderHeader('Mentions', 'total_mentions')}
                                    <th title="Vis bokforløp">Forløp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedBooks.map(b => (
                                    <tr key={b.dhlabid} className={`segment-${bookSegmentAssignments[b.dhlabid] || 'none'}`}>
                                        <td className="segment-column">
                                            <div className="segment-toggle-group" role="group" aria-label={`Segment for ${b.title || b.dhlabid}`}>
                                                <button
                                                    type="button"
                                                    className={`segment-toggle none ${!bookSegmentAssignments[b.dhlabid] ? 'active' : ''}`}
                                                    onClick={() => setBookSegmentAssignment(b.dhlabid, 'none')}
                                                    title="Ikke i noe segment"
                                                >
                                                    -
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`segment-toggle a ${bookSegmentAssignments[b.dhlabid] === 'A' ? 'active' : ''}`}
                                                    onClick={() => setBookSegmentAssignment(b.dhlabid, 'A')}
                                                    title="Segment A (blå)"
                                                >
                                                    A
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`segment-toggle b ${bookSegmentAssignments[b.dhlabid] === 'B' ? 'active' : ''}`}
                                                    onClick={() => setBookSegmentAssignment(b.dhlabid, 'B')}
                                                    title="Segment B (rød)"
                                                >
                                                    B
                                                </button>
                                            </div>
                                        </td>
                                        <td className="monospace">{b.urn.replace('URN:NBN:no-nb_digibok_', '')}</td>
                                        <td>{b.author || '-'}</td>
                                        <td>{b.year || '-'}</td>
                                        <td>{b.title || '-'}</td>
                                        <td>{b.category || '-'}</td>
                                        <td style={{ textAlign: 'right' }}>{b.unique_places?.toLocaleString() || '0'}</td>
                                        <td style={{ textAlign: 'right' }}>{b.total_mentions?.toLocaleString() || '0'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="table-route-btn"
                                                type="button"
                                                title="Vis bokforløp på kart"
                                                onClick={() => onShowBookSequence?.(b.dhlabid)}
                                            >
                                                <i className="fas fa-route"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {sortedBooks.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="empty-state">Ingen bøker i aktivt korpus</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Rnd>
    );
};
