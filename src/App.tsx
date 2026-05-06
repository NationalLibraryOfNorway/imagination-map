import { useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { StatsHUD } from './components/StatsHUD'
import { CorpusBuilderCard } from './components/CorpusBuilderCard'
import { MapMarkers } from './components/MapMarkers'
import { HeatmapLayer } from './components/HeatmapLayer'
import { SelectedPlaceOverlay } from './components/SelectedPlaceOverlay'
import { PlaceSummaryCard } from './components/PlaceSummaryCard'
import { CorpusBrowseTable } from './components/CorpusBrowseTable'
import { EntityInspectorPanel } from './components/EntityInspectorPanel'
import { Omnibox } from './components/Omnibox'
import { VisualsCard } from './components/VisualsCard'
import { SegmentViewCard } from './components/SegmentViewCard'
import { PlaceStatsCard } from './components/PlaceStatsCard'
import { MinimizedWindowsRail, type MinimizedWindowItem } from './components/MinimizedWindowsRail'
import { VisualsLauncherChip } from './components/VisualsLauncherChip'
import { SettingsLauncherChip } from './components/SettingsLauncherChip'
import { SettingsCard } from './components/SettingsCard'
import { PlaceQaCard } from './components/PlaceQaCard'
import { TemporalCard } from './components/TemporalCard'
import { GeoConcordanceCard } from './components/GeoConcordanceCard'
import { BookSequenceCard } from './components/BookSequenceCard'
import { useCorpus } from './context/CorpusContext'
import type { GeoSequenceRow } from './utils/geoApi'
import './index.css'

interface SelectedPlace {
  token: string;
  placeId?: string;
  name?: string | null;
  lat?: number | null;
  lon?: number | null;
}

type MinimizableWindowKey =
  | 'builder'
  | 'browse'
  | 'entityAuthorsList'
  | 'entityAuthorsImages'
  | 'entityPlacesList'
  | 'entityPlacesImages'
  | 'temporal'
  | 'geoConcordance'
  | 'bookSequence';

function App() {
  const {
    setIsBrowseTableOpen,
    isBrowseTableOpen,
    setIsCorpusBuilderOpen,
    isCorpusBuilderOpen,
    setIsVisualsOpen,
    isVisualsOpen,
    setIsSettingsOpen,
    isSettingsOpen,
    setIsGeoConcordanceOpen,
    isGeoConcordanceOpen,
    setMapVisualMode,
    mapVisualMode,
    activeWindow,
    setActiveWindow,
    selectedPlaceKindFilter
  } = useCorpus();
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [isAuthorsListOpen, setIsAuthorsListOpen] = useState(false);
  const [isAuthorsImagesOpen, setIsAuthorsImagesOpen] = useState(false);
  const [isPlacesListOpen, setIsPlacesListOpen] = useState(false);
  const [isPlacesImagesOpen, setIsPlacesImagesOpen] = useState(false);
  const [isTemporalOpen, setIsTemporalOpen] = useState(false);
  const [isBookSequenceOpen, setIsBookSequenceOpen] = useState(false);
  const [sequenceBookId, setSequenceBookId] = useState<number | null>(null);
  const [sequenceRows, setSequenceRows] = useState<GeoSequenceRow[]>([]);
  const [sequenceDimOthers, setSequenceDimOthers] = useState(true);
  const [sequenceShowLine, setSequenceShowLine] = useState(false);
  const [sequenceShortStepsMode, setSequenceShortStepsMode] = useState(true);
  const [sequenceMaxStepKm, setSequenceMaxStepKm] = useState(350);
  const [sequenceProgressPct, setSequenceProgressPct] = useState(0);
  const [geoFocusPlaceIds, setGeoFocusPlaceIds] = useState<string[]>([]);
  const [geoFocusDimOthers, setGeoFocusDimOthers] = useState(true);
  const [geoFocusStyle, setGeoFocusStyle] = useState<'fill' | 'ring'>('ring');
  const [isPlaceStatsOpen, setIsPlaceStatsOpen] = useState(false);
  const [isPlaceQaOpen, setIsPlaceQaOpen] = useState(false);
  const [isSegmentViewOpen, setIsSegmentViewOpen] = useState(false);
  const [minimizedWindows, setMinimizedWindows] = useState<Partial<Record<MinimizableWindowKey, boolean>>>({});

  const isMinimized = (windowKey: MinimizableWindowKey) => Boolean(minimizedWindows[windowKey]);
  const restoreWindow = (windowKey: MinimizableWindowKey) => {
    setMinimizedWindows((prev) => ({ ...prev, [windowKey]: false }));
    setActiveWindow(windowKey);
  };
  const minimizeWindow = (windowKey: MinimizableWindowKey) => {
    setMinimizedWindows((prev) => ({ ...prev, [windowKey]: true }));
    if (activeWindow === windowKey) setActiveWindow(null);
  };
  const clearMinimizedWindow = (windowKey: MinimizableWindowKey) => {
    setMinimizedWindows((prev) => ({ ...prev, [windowKey]: false }));
  };

  const openBookSequenceForBook = (bookId: number) => {
    setSequenceBookId(bookId);
    setIsBookSequenceOpen(true);
    restoreWindow('bookSequence');
  };

  const exitBookSequenceMode = () => {
    clearMinimizedWindow('bookSequence');
    setIsBookSequenceOpen(false);
    setSequenceRows([]);
    setSequenceBookId(null);
    setSequenceProgressPct(0);
    if (activeWindow === 'bookSequence') setActiveWindow(null);
  };

  const minimizedWindowItems: MinimizedWindowItem[] = [
    isCorpusBuilderOpen && isMinimized('builder')
      ? { id: 'builder', label: 'Corpus Builder', iconClassName: 'fas fa-tools', onRestore: () => restoreWindow('builder') }
      : null,
    isBrowseTableOpen && isMinimized('browse')
      ? { id: 'browse', label: 'Bøker', iconClassName: 'fas fa-list', onRestore: () => restoreWindow('browse') }
      : null,
    isAuthorsListOpen && isMinimized('entityAuthorsList')
      ? { id: 'entityAuthorsList', label: 'Forfattere (liste)', iconClassName: 'fas fa-user-edit', onRestore: () => restoreWindow('entityAuthorsList') }
      : null,
    isAuthorsImagesOpen && isMinimized('entityAuthorsImages')
      ? { id: 'entityAuthorsImages', label: 'Forfattere (bilder)', iconClassName: 'fas fa-user-edit', onRestore: () => restoreWindow('entityAuthorsImages') }
      : null,
    isPlacesListOpen && isMinimized('entityPlacesList')
      ? { id: 'entityPlacesList', label: 'Steder (liste)', iconClassName: 'fas fa-map-marker-alt', onRestore: () => restoreWindow('entityPlacesList') }
      : null,
    isPlacesImagesOpen && isMinimized('entityPlacesImages')
      ? { id: 'entityPlacesImages', label: 'Steder (bilder)', iconClassName: 'fas fa-map-marker-alt', onRestore: () => restoreWindow('entityPlacesImages') }
      : null,
    isTemporalOpen && isMinimized('temporal')
      ? { id: 'temporal', label: 'Tidsvisning', iconClassName: 'fas fa-calendar-alt', onRestore: () => restoreWindow('temporal') }
      : null,
    isGeoConcordanceOpen && isMinimized('geoConcordance')
      ? { id: 'geoConcordance', label: 'Geo-konkordans', iconClassName: 'fas fa-stream', onRestore: () => restoreWindow('geoConcordance') }
      : null,
    isBookSequenceOpen && isMinimized('bookSequence')
      ? { id: 'bookSequence', label: 'Bokforløp', iconClassName: 'fas fa-route', onRestore: () => restoreWindow('bookSequence') }
      : null
  ].filter((item): item is MinimizedWindowItem => item !== null);

  return (
    <div className="app-shell">
      {/* Map layer */}
      <MapContainer center={[60.472, 8.468]} zoom={6} className="map-container" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapVisualMode === 'heatmap' || mapVisualMode === 'heatmap-all' ? (
          <HeatmapLayer useFullDataset={mapVisualMode === 'heatmap-all'} />
        ) : (
          <MapMarkers
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              setActiveWindow('summary');
            }}
            bookSequence={{
              rows: sequenceRows,
              dimOthers: sequenceDimOthers,
              showLine: sequenceShowLine,
              shortStepsMode: sequenceShortStepsMode,
              maxStepKm: sequenceMaxStepKm,
              progressPct: sequenceProgressPct
            }}
            geoFocus={{
              placeIds: geoFocusPlaceIds,
              dimOthers: geoFocusDimOthers,
              style: geoFocusStyle
            }}
          />
        )}
        <SelectedPlaceOverlay selectedPlace={selectedPlace} />
      </MapContainer>

      {/* Floating UI Elements */}
      <Omnibox
        onSelectPlace={(place) => {
          setSelectedPlace(place);
          setActiveWindow('summary');
        }}
      />
      <VisualsLauncherChip
        hasActivePlaceKindFilter={selectedPlaceKindFilter !== null}
        onVisualsDefaultClick={() => {
          if (isVisualsOpen && activeWindow === 'visuals') {
            setIsVisualsOpen(false);
            setActiveWindow(null);
          } else {
            setIsVisualsOpen(true);
            setActiveWindow('visuals');
          }
        }}
        onSegmentViewClick={() => {
          if (isSegmentViewOpen && activeWindow === 'segmentView') {
            setIsSegmentViewOpen(false);
            setActiveWindow(null);
          } else {
            setIsSegmentViewOpen(true);
            setActiveWindow('segmentView');
          }
        }}
        onVisualsPlaceStatsClick={() => {
          if (isPlaceStatsOpen && activeWindow === 'placeStats') {
            setIsPlaceStatsOpen(false);
            setActiveWindow(null);
          } else {
            setIsPlaceStatsOpen(true);
            setActiveWindow('placeStats');
          }
        }}
      />
      <SettingsLauncherChip
        onSettingsPanelClick={() => {
          if (isSettingsOpen && activeWindow === 'settings') {
            setIsSettingsOpen(false);
            setActiveWindow(null);
          } else {
            setIsSettingsOpen(true);
            setActiveWindow('settings');
          }
        }}
        onPlaceQaClick={() => {
          if (isPlaceQaOpen && activeWindow === 'placeQa') {
            setIsPlaceQaOpen(false);
            setActiveWindow(null);
          } else {
            setIsPlaceQaOpen(true);
            setActiveWindow('placeQa');
          }
        }}
        onSuggestChangeClick={() => {
          const title = encodeURIComponent('Forslag: ');
          const body = encodeURIComponent([
            '## Forslag',
            'Beskriv ønsket endring her.',
            '',
            '## Hvor i appen',
            'f.eks. Tidsvisning / Geo-konkordans / Steder',
            '',
            '## Hvorfor',
            'Hva blir bedre for brukeren?'
          ].join('\n'));
          window.open(`https://github.com/Yoonsen/imagination-frontend/issues/new?title=${title}&body=${body}`, '_blank', 'noopener,noreferrer');
        }}
      />
      <MinimizedWindowsRail items={minimizedWindowItems} />
      <StatsHUD
        onBooksCorpusBuilderClick={() => {
          if (isCorpusBuilderOpen && !isMinimized('builder') && activeWindow === 'builder') {
            clearMinimizedWindow('builder');
            setIsCorpusBuilderOpen(false);
            setActiveWindow(null);
          } else {
            setIsCorpusBuilderOpen(true);
            restoreWindow('builder');
          }
        }}
        onBooksTableClick={() => {
          if (isBrowseTableOpen && !isMinimized('browse') && activeWindow === 'browse') {
            clearMinimizedWindow('browse');
            setIsBrowseTableOpen(false);
            setActiveWindow(null);
          } else {
            setIsBrowseTableOpen(true);
            restoreWindow('browse');
          }
        }}
        onAuthorsListClick={() => {
          if (isAuthorsListOpen && !isMinimized('entityAuthorsList') && activeWindow === 'entityAuthorsList') {
            clearMinimizedWindow('entityAuthorsList');
            setIsAuthorsListOpen(false);
            setActiveWindow(null);
          } else {
            setIsAuthorsListOpen(true);
            restoreWindow('entityAuthorsList');
          }
        }}
        onAuthorsImagesClick={() => {
          if (isAuthorsImagesOpen && !isMinimized('entityAuthorsImages') && activeWindow === 'entityAuthorsImages') {
            clearMinimizedWindow('entityAuthorsImages');
            setIsAuthorsImagesOpen(false);
            setActiveWindow(null);
          } else {
            setIsAuthorsImagesOpen(true);
            restoreWindow('entityAuthorsImages');
          }
        }}
        onPlacesListClick={() => {
          if (isPlacesListOpen && !isMinimized('entityPlacesList') && activeWindow === 'entityPlacesList') {
            clearMinimizedWindow('entityPlacesList');
            setIsPlacesListOpen(false);
            setActiveWindow(null);
          } else {
            setIsPlacesListOpen(true);
            restoreWindow('entityPlacesList');
          }
        }}
        onPlacesImagesClick={() => {
          if (isPlacesImagesOpen && !isMinimized('entityPlacesImages') && activeWindow === 'entityPlacesImages') {
            clearMinimizedWindow('entityPlacesImages');
            setIsPlacesImagesOpen(false);
            setActiveWindow(null);
          } else {
            setIsPlacesImagesOpen(true);
            restoreWindow('entityPlacesImages');
          }
        }}
        onPlacesGeoConcordanceClick={() => {
          if (isGeoConcordanceOpen && !isMinimized('geoConcordance') && activeWindow === 'geoConcordance') {
            clearMinimizedWindow('geoConcordance');
            setIsGeoConcordanceOpen(false);
            setActiveWindow(null);
          } else {
            setIsGeoConcordanceOpen(true);
            restoreWindow('geoConcordance');
          }
        }}
        onPlacesBookSequenceClick={() => {
          if (isBookSequenceOpen && !isMinimized('bookSequence') && activeWindow === 'bookSequence') {
            exitBookSequenceMode();
          } else {
            setIsBookSequenceOpen(true);
            restoreWindow('bookSequence');
          }
        }}
        onYearClick={() => {
          if (isTemporalOpen && !isMinimized('temporal') && activeWindow === 'temporal') {
            clearMinimizedWindow('temporal');
            setIsTemporalOpen(false);
            setActiveWindow(null);
          } else {
            setIsTemporalOpen(true);
            restoreWindow('temporal');
          }
        }}
      />
      <div className="workspace-zone">
        <CorpusBuilderCard
          isMinimized={isMinimized('builder')}
          onMinimize={() => minimizeWindow('builder')}
          onClose={() => {
            clearMinimizedWindow('builder');
            setIsCorpusBuilderOpen(false);
            if (activeWindow === 'builder') setActiveWindow(null);
          }}
        />
        <VisualsCard />
        <SegmentViewCard
          isOpen={isSegmentViewOpen}
          onClose={() => {
            setIsSegmentViewOpen(false);
            if (activeWindow === 'segmentView') setActiveWindow(null);
          }}
        />
        <PlaceStatsCard
          isOpen={isPlaceStatsOpen}
          onClose={() => {
            setIsPlaceStatsOpen(false);
            if (activeWindow === 'placeStats') setActiveWindow(null);
          }}
        />
        <SettingsCard />
        <PlaceQaCard
          isOpen={isPlaceQaOpen}
          onClose={() => {
            setIsPlaceQaOpen(false);
            if (activeWindow === 'placeQa') setActiveWindow(null);
          }}
        />
        <GeoConcordanceCard
          isOpen={isGeoConcordanceOpen}
          isMinimized={isMinimized('geoConcordance')}
          onMinimize={() => minimizeWindow('geoConcordance')}
          onClose={() => {
            clearMinimizedWindow('geoConcordance');
            setIsGeoConcordanceOpen(false);
            if (activeWindow === 'geoConcordance') setActiveWindow(null);
          }}
          onApplyMapFocus={({ placeIds, dimOthers, style }) => {
            setGeoFocusPlaceIds(placeIds);
            setGeoFocusDimOthers(dimOthers);
            setGeoFocusStyle(style);
            setMapVisualMode('map');
          }}
          onClearMapFocus={() => setGeoFocusPlaceIds([])}
          mapFocusAppliedCount={geoFocusPlaceIds.length}
        />
        <BookSequenceCard
          isOpen={isBookSequenceOpen}
          isMinimized={isMinimized('bookSequence')}
          onMinimize={() => minimizeWindow('bookSequence')}
          onClose={exitBookSequenceMode}
          onExitMode={exitBookSequenceMode}
          selectedBookId={sequenceBookId}
          onSelectBookId={setSequenceBookId}
          sequenceRows={sequenceRows}
          onSetSequenceRows={(rows) => {
            setSequenceRows(rows);
            setSequenceProgressPct(0);
          }}
          dimOthers={sequenceDimOthers}
          onSetDimOthers={setSequenceDimOthers}
          showLine={sequenceShowLine}
          onSetShowLine={setSequenceShowLine}
          shortStepsMode={sequenceShortStepsMode}
          onSetShortStepsMode={setSequenceShortStepsMode}
          maxStepKm={sequenceMaxStepKm}
          onSetMaxStepKm={setSequenceMaxStepKm}
          progressPct={sequenceProgressPct}
          onSetProgressPct={setSequenceProgressPct}
        />
        <TemporalCard
          isOpen={isTemporalOpen}
          isMinimized={isMinimized('temporal')}
          onMinimize={() => minimizeWindow('temporal')}
          onClose={() => {
            clearMinimizedWindow('temporal');
            setIsTemporalOpen(false);
            if (activeWindow === 'temporal') setActiveWindow(null);
          }}
        />
        <CorpusBrowseTable
          isMinimized={isMinimized('browse')}
          onMinimize={() => minimizeWindow('browse')}
          onClose={() => {
            clearMinimizedWindow('browse');
            setIsBrowseTableOpen(false);
            if (activeWindow === 'browse') setActiveWindow(null);
          }}
          onShowBookSequence={openBookSequenceForBook}
        />
        {isAuthorsListOpen && (
          <EntityInspectorPanel
            mode="authors"
            windowKey="entityAuthorsList"
            defaultPosition={{ x: 80, y: 24 }}
            initialTab="list"
            isMinimized={isMinimized('entityAuthorsList')}
            onMinimize={() => minimizeWindow('entityAuthorsList')}
            onClose={() => {
              clearMinimizedWindow('entityAuthorsList');
              setIsAuthorsListOpen(false);
              if (activeWindow === 'entityAuthorsList') setActiveWindow(null);
            }}
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              setActiveWindow('summary');
            }}
          />
        )}
        {isAuthorsImagesOpen && (
          <EntityInspectorPanel
            mode="authors"
            windowKey="entityAuthorsImages"
            defaultPosition={{ x: 140, y: 70 }}
            initialTab="images"
            isMinimized={isMinimized('entityAuthorsImages')}
            onMinimize={() => minimizeWindow('entityAuthorsImages')}
            onClose={() => {
              clearMinimizedWindow('entityAuthorsImages');
              setIsAuthorsImagesOpen(false);
              if (activeWindow === 'entityAuthorsImages') setActiveWindow(null);
            }}
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              setActiveWindow('summary');
            }}
          />
        )}
        {isPlacesListOpen && (
          <EntityInspectorPanel
            mode="places"
            windowKey="entityPlacesList"
            defaultPosition={{ x: 180, y: 90 }}
            initialTab="list"
            isMinimized={isMinimized('entityPlacesList')}
            onMinimize={() => minimizeWindow('entityPlacesList')}
            onClose={() => {
              clearMinimizedWindow('entityPlacesList');
              setIsPlacesListOpen(false);
              if (activeWindow === 'entityPlacesList') setActiveWindow(null);
            }}
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              setActiveWindow('summary');
            }}
          />
        )}
        {isPlacesImagesOpen && (
          <EntityInspectorPanel
            mode="places"
            windowKey="entityPlacesImages"
            defaultPosition={{ x: 240, y: 140 }}
            initialTab="images"
            isMinimized={isMinimized('entityPlacesImages')}
            onMinimize={() => minimizeWindow('entityPlacesImages')}
            onClose={() => {
              clearMinimizedWindow('entityPlacesImages');
              setIsPlacesImagesOpen(false);
              if (activeWindow === 'entityPlacesImages') setActiveWindow(null);
            }}
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              setActiveWindow('summary');
            }}
          />
        )}
        <PlaceSummaryCard
          token={selectedPlace?.token || null}
          placeId={selectedPlace?.placeId}
          fallbackName={selectedPlace?.name}
          fallbackLat={selectedPlace?.lat}
          fallbackLon={selectedPlace?.lon}
          onClose={() => setSelectedPlace(null)}
          onShowBookSequence={openBookSequenceForBook}
        />
      </div>

    </div>
  )
}

export default App
