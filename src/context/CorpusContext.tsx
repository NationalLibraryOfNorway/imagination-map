import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

export interface BookMetadata {
  dhlabid: number;
  urn: string;
  author: string | null;
  year: number | null;
  category: string | null;
  title: string | null;
  unique_places?: number;
  total_mentions?: number;
}

export interface PlacePoint {
    id: string;
    token: string;
    name: string | null;
    lat: number;
    lon: number;
    frequency: number;
    doc_count: number;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toPlacePoint = (row: any): PlacePoint | null => {
  const idRaw = row?.nb_place_id ?? row?.id;
  const tokenRaw = row?.token ?? row?.historical_name ?? row?.name ?? row?.modern_name;
  const nameRaw = row?.name ?? row?.modern_name ?? row?.canonical_name ?? row?.token;
  const lat = toNumber(row?.lat ?? row?.latitude);
  const lon = toNumber(row?.lon ?? row?.longitude);
  const frequency = toNumber(row?.frequency ?? row?.mentions ?? row?.count) ?? 0;
  const docCount = toNumber(row?.doc_count ?? row?.book_count ?? row?.docs) ?? 0;

  if (lat === null || lon === null) return null;
  const id = String(idRaw ?? '').trim();
  const token = String(tokenRaw ?? '').trim();
  if (!id || !token) return null;

  return {
    id,
    token,
    name: nameRaw ? String(nameRaw) : null,
    lat,
    lon,
    frequency,
    doc_count: docCount
  };
};

const normalizePlaces = (rows: unknown): PlacePoint[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => toPlacePoint(row))
    .filter((row): row is PlacePoint => row !== null);
};

export interface CorpusSegment {
  id: string;
  label: string;
  dhlabids: number[];
  createdAt: string;
  updatedAt: string;
}

interface CorpusContextType {
  allBooks: BookMetadata[];
  activeDhlabids: number[];
  setActiveDhlabids: (ids: number[]) => void;
  segments: CorpusSegment[];
  selectedSegmentId: string | null;
  saveSegment: (label: string, ids?: number[]) => void;
  deleteSegment: (segmentId: string) => void;
  activateSegment: (segmentId: string) => void;
  clearSelectedSegment: () => void;
  compareSegmentsEnabled: boolean;
  setCompareSegmentsEnabled: (enabled: boolean) => void;
  compareSegmentAId: string | null;
  setCompareSegmentAId: (segmentId: string | null) => void;
  compareSegmentBId: string | null;
  setCompareSegmentBId: (segmentId: string | null) => void;
  bookSegmentAssignments: Record<number, 'A' | 'B'>;
  setBookSegmentAssignment: (bookId: number, segment: 'none' | 'A' | 'B') => void;
  clearBookSegmentAssignments: () => void;
  segmentABookIds: number[];
  segmentBBookIds: number[];
  API_URL: string;
  LEGACY_API_URL: string;
  isLoading: boolean;
  error: string | null;
  // Computed values based on active set
  activeBooksMetadata: BookMetadata[];
  isBrowseTableOpen: boolean;
  setIsBrowseTableOpen: (val: boolean) => void;
  isCorpusBuilderOpen: boolean;
  setIsCorpusBuilderOpen: (val: boolean) => void;
  isVisualsOpen: boolean;
  setIsVisualsOpen: (val: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
  isGeoConcordanceOpen: boolean;
  setIsGeoConcordanceOpen: (val: boolean) => void;
  activeWindow: 'builder' | 'browse' | 'visuals' | 'settings' | 'temporal' | 'geoConcordance' | 'bookSequence' | 'entityAuthors' | 'entityPlaces' | 'summary' | null;
  setActiveWindow: (window: 'builder' | 'browse' | 'visuals' | 'settings' | 'temporal' | 'geoConcordance' | 'bookSequence' | 'entityAuthors' | 'entityPlaces' | 'summary' | null) => void;
  // Map properties
  places: PlacePoint[];
  totalPlaces: number;
  isPlacesLoading: boolean;
  mapVisualMode: 'map' | 'heatmap' | 'heatmap-all';
  setMapVisualMode: (mode: 'map' | 'heatmap' | 'heatmap-all') => void;
  downlightColorMode: 'red' | 'blue';
  setDownlightColorMode: (mode: 'red' | 'blue') => void;
  downlightPercentile: number;
  setDownlightPercentile: (val: number) => void;
  lowFreqGreenStrength: number;
  setLowFreqGreenStrength: (val: number) => void;
  heatmapStrength: number;
  setHeatmapStrength: (val: number) => void;
  markerSizeScale: number;
  setMarkerSizeScale: (val: number) => void;
  maxPlacesInView: number;
  setMaxPlacesInView: (val: number) => void;
  temporalEnabled: boolean;
  setTemporalEnabled: (val: boolean) => void;
  temporalCutoffYear: number | null;
  setTemporalCutoffYear: (year: number | null) => void;
  temporalMode: 'color' | 'toggle';
  setTemporalMode: (mode: 'color' | 'toggle') => void;
}

const CorpusContext = createContext<CorpusContextType | undefined>(undefined);
const SEGMENTS_STORAGE_KEY = 'imagination.corpus.segments.v1';
const ASSIGNMENTS_STORAGE_KEY = 'imagination.corpus.assignments.v1';

export const CorpusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allBooks, setAllBooks] = useState<BookMetadata[]>([]);
  const [activeDhlabidsState, setActiveDhlabidsState] = useState<number[]>([]);
  const [segments, setSegments] = useState<CorpusSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [compareSegmentsEnabled, setCompareSegmentsEnabled] = useState(false);
  const [compareSegmentAId, setCompareSegmentAId] = useState<string | null>(null);
  const [compareSegmentBId, setCompareSegmentBId] = useState<string | null>(null);
  const [bookSegmentAssignments, setBookSegmentAssignments] = useState<Record<number, 'A' | 'B'>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBrowseTableOpen, setIsBrowseTableOpen] = useState(false);
  const [isCorpusBuilderOpen, setIsCorpusBuilderOpen] = useState(false);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeoConcordanceOpen, setIsGeoConcordanceOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState<'builder' | 'browse' | 'visuals' | 'settings' | 'temporal' | 'geoConcordance' | 'bookSequence' | 'entityAuthors' | 'entityPlaces' | 'summary' | null>(null);
  
  const [places, setPlaces] = useState<PlacePoint[]>([]);
  const [totalPlaces, setTotalPlaces] = useState<number>(0);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  const [mapVisualMode, setMapVisualMode] = useState<'map' | 'heatmap' | 'heatmap-all'>('map');
  const [downlightColorMode, setDownlightColorMode] = useState<'red' | 'blue'>('blue');
  const [downlightPercentile, setDownlightPercentile] = useState<number>(0);
  const [lowFreqGreenStrength, setLowFreqGreenStrength] = useState<number>(0);
  const [heatmapStrength, setHeatmapStrength] = useState<number>(100);
  const [markerSizeScale, setMarkerSizeScale] = useState<number>(100);
  const [maxPlacesInView, setMaxPlacesInView] = useState<number>(7000);
  const [temporalEnabled, setTemporalEnabled] = useState<boolean>(false);
  const [temporalCutoffYear, setTemporalCutoffYear] = useState<number | null>(null);
  const [temporalMode, setTemporalMode] = useState<'color' | 'toggle'>('color');

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.nb.no/dhlab/imag';
  const LEGACY_API_URL = import.meta.env.VITE_LEGACY_API_URL || 'https://api.nb.no/dhlab';
  const activeDhlabids = activeDhlabidsState;

  const normalizeIds = (ids: number[]) =>
    Array.from(
      new Set(
        ids
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      )
    );

  const setActiveDhlabids = (ids: number[]) => {
    setSelectedSegmentId(null);
    setActiveDhlabidsState(normalizeIds(ids));
  };

  const clearSelectedSegment = () => {
    setSelectedSegmentId(null);
  };

  const setBookSegmentAssignment = (bookId: number, segment: 'none' | 'A' | 'B') => {
    setBookSegmentAssignments((prev) => {
      const next = { ...prev };
      if (segment === 'none') {
        delete next[bookId];
      } else {
        next[bookId] = segment;
      }
      return next;
    });
  };

  const clearBookSegmentAssignments = () => {
    setBookSegmentAssignments({});
  };

  const saveSegment = (label: string, ids?: number[]) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    const segmentIds = normalizeIds(ids ?? activeDhlabidsState);
    const now = new Date().toISOString();
    const segmentId = `seg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setSegments((prev) => [
      {
        id: segmentId,
        label: cleanLabel,
        dhlabids: segmentIds,
        createdAt: now,
        updatedAt: now
      },
      ...prev
    ]);
  };

  const deleteSegment = (segmentId: string) => {
    setSegments((prev) => prev.filter((segment) => segment.id !== segmentId));
    setSelectedSegmentId((prev) => (prev === segmentId ? null : prev));
    setCompareSegmentAId((prev) => (prev === segmentId ? null : prev));
    setCompareSegmentBId((prev) => (prev === segmentId ? null : prev));
  };

  const activateSegment = (segmentId: string) => {
    const segment = segments.find((item) => item.id === segmentId);
    if (!segment) return;
    setSelectedSegmentId(segment.id);
    setActiveDhlabidsState(normalizeIds(segment.dhlabids));
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SEGMENTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const restored = parsed
        .map((item) => ({
          id: typeof item?.id === 'string' ? item.id : '',
          label: typeof item?.label === 'string' ? item.label : '',
          dhlabids: Array.isArray(item?.dhlabids) ? normalizeIds(item.dhlabids) : [],
          createdAt: typeof item?.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          updatedAt: typeof item?.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
        }))
        .filter((item) => item.id && item.label);
      setSegments(restored);
    } catch (err) {
      console.error('Could not restore corpus segments', err);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SEGMENTS_STORAGE_KEY, JSON.stringify(segments));
    } catch (err) {
      console.error('Could not persist corpus segments', err);
    }
  }, [segments]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      const restored = Object.entries(parsed).reduce<Record<number, 'A' | 'B'>>((acc, [rawId, value]) => {
        const id = Number(rawId);
        if (!Number.isFinite(id)) return acc;
        if (value === 'A' || value === 'B') acc[id] = value;
        return acc;
      }, {});
      setBookSegmentAssignments(restored);
    } catch (err) {
      console.error('Could not restore A/B assignments', err);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(bookSegmentAssignments));
    } catch (err) {
      console.error('Could not persist A/B assignments', err);
    }
  }, [bookSegmentAssignments]);

  useEffect(() => {
    // Fetch all metadata on initial load
    fetch(`${API_URL}/api/metadata/all`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch metadata");
        return res.json();
      })
      .then(data => {
        setAllBooks(data.books || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeDhlabids.length === 0) {
      setPlaces([]);
      setTotalPlaces(0);
      return;
    }
    setIsPlacesLoading(true);
    fetch(`${API_URL}/api/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dhlabids: activeDhlabids, maxPlaces: maxPlacesInView })
    }).then(res => {
      if (!res.ok) throw new Error("Failed to fetch places");
      return res.json();
    })
      .then(data => { 
          const normalizedPlaces = normalizePlaces(data.places || []);
          setPlaces(normalizedPlaces);
          setTotalPlaces(
            Number(data.total_places ?? data.totalPlaces)
            || normalizedPlaces.length
          );
          setIsPlacesLoading(false); 
      })
      .catch(err => { console.error(err); setIsPlacesLoading(false); });
  }, [activeDhlabids, API_URL, maxPlacesInView]);

  const activeBooksMetadata = useMemo(() => {
    const activeSet = new Set(activeDhlabids);
    return allBooks.filter(b => activeSet.has(b.dhlabid));
  }, [allBooks, activeDhlabids]);

  const segmentABookIds = useMemo(
    () => Object.entries(bookSegmentAssignments)
      .filter(([, segment]) => segment === 'A')
      .map(([id]) => Number(id))
      .filter((id) => Number.isFinite(id)),
    [bookSegmentAssignments]
  );

  const segmentBBookIds = useMemo(
    () => Object.entries(bookSegmentAssignments)
      .filter(([, segment]) => segment === 'B')
      .map(([id]) => Number(id))
      .filter((id) => Number.isFinite(id)),
    [bookSegmentAssignments]
  );

  return (
    <CorpusContext.Provider value={{
      allBooks,
      activeDhlabids,
      setActiveDhlabids,
      segments,
      selectedSegmentId,
      saveSegment,
      deleteSegment,
      activateSegment,
      clearSelectedSegment,
      compareSegmentsEnabled,
      setCompareSegmentsEnabled,
      compareSegmentAId,
      setCompareSegmentAId,
      compareSegmentBId,
      setCompareSegmentBId,
      bookSegmentAssignments,
      setBookSegmentAssignment,
      clearBookSegmentAssignments,
      segmentABookIds,
      segmentBBookIds,
      API_URL,
      LEGACY_API_URL,
      isLoading,
      error,
      activeBooksMetadata,
      isBrowseTableOpen,
      setIsBrowseTableOpen,
      isCorpusBuilderOpen,
      setIsCorpusBuilderOpen,
      isVisualsOpen,
      setIsVisualsOpen,
      isSettingsOpen,
      setIsSettingsOpen,
      isGeoConcordanceOpen,
      setIsGeoConcordanceOpen,
      activeWindow,
      setActiveWindow,
      places,
      totalPlaces,
      isPlacesLoading,
      mapVisualMode,
      setMapVisualMode,
      downlightColorMode,
      setDownlightColorMode,
      downlightPercentile,
      setDownlightPercentile,
      lowFreqGreenStrength,
      setLowFreqGreenStrength,
      heatmapStrength,
      setHeatmapStrength,
      markerSizeScale,
      setMarkerSizeScale,
      maxPlacesInView,
      setMaxPlacesInView,
      temporalEnabled,
      setTemporalEnabled,
      temporalCutoffYear,
      setTemporalCutoffYear,
      temporalMode,
      setTemporalMode
    }}>
      {children}
    </CorpusContext.Provider>
  );
};

export const useCorpus = () => {
  const context = useContext(CorpusContext);
  if (context === undefined) {
    throw new Error('useCorpus must be used within a CorpusProvider');
  }
  return context;
};
