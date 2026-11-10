import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { MapLabelLanguage, MapLabelMode } from '../types/mapLabels';
import { normalizePlaces } from '../utils/placePoints';

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

export interface PlaceSurfaceForm {
    surface: string;
    mentions: number;
    docCount: number;
}

export interface PlacePoint {
    id: string;
    nbPlaceId?: number | null;
    token: string;
    name: string | null;
    lat: number;
    lon: number;
    frequency: number;
    doc_count: number;
    featureCode?: string | null;
    kind?: string | null;
    /** Surface forms linked to the place, counted across the whole collection. */
    surfaceForms?: PlaceSurfaceForm[];
}

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
  activeWindow: 'builder' | 'browse' | 'visuals' | 'segmentView' | 'placeStats' | 'settings' | 'placeQa' | 'temporal' | 'geoConcordance' | 'bookSequence' | 'entityAuthorsList' | 'entityAuthorsImages' | 'entityPlacesList' | 'entityPlacesImages' | 'summary' | null;
  setActiveWindow: (window: 'builder' | 'browse' | 'visuals' | 'segmentView' | 'placeStats' | 'settings' | 'placeQa' | 'temporal' | 'geoConcordance' | 'bookSequence' | 'entityAuthorsList' | 'entityAuthorsImages' | 'entityPlacesList' | 'entityPlacesImages' | 'summary' | null) => void;
  // Map properties
  places: PlacePoint[];
  totalPlaces: number;
  isPlacesLoading: boolean;
  placesError: string | null;
  mapVisualMode: 'map' | 'heatmap' | 'heatmap-all';
  setMapVisualMode: (mode: 'map' | 'heatmap' | 'heatmap-all') => void;
  mapLabelLanguage: MapLabelLanguage;
  setMapLabelLanguage: (language: MapLabelLanguage) => void;
  mapLabelMode: MapLabelMode;
  setMapLabelMode: (mode: MapLabelMode) => void;
  downlightColorMode: 'red' | 'blue';
  setDownlightColorMode: (mode: 'red' | 'blue') => void;
  lowFrequencyCutoffPercentile: number;
  setLowFrequencyCutoffPercentile: (val: number) => void;
  lowFrequencyGreenPercentile: number;
  setLowFrequencyGreenPercentile: (val: number) => void;
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
  selectedPlaceKindFilter: string | null;
  setSelectedPlaceKindFilter: (kind: string | null) => void;
  spuriousMentionsRatioThreshold: number;
  setSpuriousMentionsRatioThreshold: (value: number) => void;
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
  const [activeWindow, setActiveWindow] = useState<'builder' | 'browse' | 'visuals' | 'segmentView' | 'placeStats' | 'settings' | 'placeQa' | 'temporal' | 'geoConcordance' | 'bookSequence' | 'entityAuthorsList' | 'entityAuthorsImages' | 'entityPlacesList' | 'entityPlacesImages' | 'summary' | null>(null);
  
  const [places, setPlaces] = useState<PlacePoint[]>([]);
  const [totalPlaces, setTotalPlaces] = useState<number>(0);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [mapVisualMode, setMapVisualMode] = useState<'map' | 'heatmap' | 'heatmap-all'>('map');
  const [mapLabelLanguage, setMapLabelLanguage] = useState<MapLabelLanguage>('no');
  const [mapLabelMode, setMapLabelMode] = useState<MapLabelMode>('countries');
  const [downlightColorMode, setDownlightColorMode] = useState<'red' | 'blue'>('blue');
  const [lowFrequencyCutoffPercentile, setLowFrequencyCutoffPercentile] = useState<number>(0);
  const [lowFrequencyGreenPercentile, setLowFrequencyGreenPercentile] = useState<number>(0);
  const [heatmapStrength, setHeatmapStrength] = useState<number>(100);
  const [markerSizeScale, setMarkerSizeScale] = useState<number>(100);
  const [maxPlacesInView, setMaxPlacesInView] = useState<number>(7000);
  const [temporalEnabled, setTemporalEnabled] = useState<boolean>(false);
  const [temporalCutoffYear, setTemporalCutoffYear] = useState<number | null>(null);
  const [temporalMode, setTemporalMode] = useState<'color' | 'toggle'>('toggle');
  const [selectedPlaceKindFilter, setSelectedPlaceKindFilter] = useState<string | null>(null);
  const [spuriousMentionsRatioThreshold, setSpuriousMentionsRatioThreshold] = useState<number>(50);

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
      setPlacesError(null);
      return;
    }
    setIsPlacesLoading(true);
    setPlacesError(null);
    fetch(`${API_URL}/api/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dhlabids: activeDhlabids, maxPlaces: maxPlacesInView })
    }).then(async res => {
      if (!res.ok) {
        const detail = await res.json()
          .then(body => (typeof body?.detail === 'string' ? body.detail : ''))
          .catch(() => '');
        throw new Error(`Kunne ikke hente steder (HTTP ${res.status})${detail ? `: ${detail}` : ''}`);
      }
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
      .catch(err => {
        console.error(err);
        setPlaces([]);
        setTotalPlaces(0);
        setPlacesError(err instanceof Error ? err.message : 'Kunne ikke hente steder');
        setIsPlacesLoading(false);
      });
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
      placesError,
      mapVisualMode,
      setMapVisualMode,
      mapLabelLanguage,
      setMapLabelLanguage,
      mapLabelMode,
      setMapLabelMode,
      downlightColorMode,
      setDownlightColorMode,
      lowFrequencyCutoffPercentile,
      setLowFrequencyCutoffPercentile,
      lowFrequencyGreenPercentile,
      setLowFrequencyGreenPercentile,
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
      setTemporalMode,
      selectedPlaceKindFilter,
      setSelectedPlaceKindFilter,
      spuriousMentionsRatioThreshold,
      setSpuriousMentionsRatioThreshold
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
