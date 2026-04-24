import React, { useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useCorpus } from '../context/CorpusContext';
import { useWindowLayout } from '../utils/windowLayout';
import './VisualsCard.css';

interface PlaceStatsBucket {
  kind?: string | null;
  label?: string | null;
  featureCode?: string | null;
  uniquePlaces: number;
  mentions: number;
  docCount: number;
}

interface PlaceStatsResponse {
  totals: {
    uniquePlaces: number;
    mentions: number;
    docCount: number;
  };
  kinds?: PlaceStatsBucket[];
  featureCodes?: PlaceStatsBucket[];
}

interface PlaceStatsCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlaceStatsCard: React.FC<PlaceStatsCardProps> = ({ isOpen, onClose }) => {
  const {
    activeWindow,
    setActiveWindow,
    activeDhlabids,
    API_URL,
    selectedPlaceKindFilter,
    setSelectedPlaceKindFilter
  } = useCorpus();
  const [placeStats, setPlaceStats] = useState<PlaceStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { layout, onDrag, onDragStop, onResizeStop } = useWindowLayout({
    key: 'place-stats',
    defaultLayout: { x: 360, y: 20, width: 340, height: 640 },
    minWidth: 300,
    minHeight: 360
  });

  useEffect(() => {
    if (!isOpen) return;

    if (activeDhlabids.length === 0) {
      setPlaceStats(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`${API_URL}/api/places/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dhlabids: activeDhlabids,
        maxFeatureCodes: 8
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }
        return res.json() as Promise<PlaceStatsResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setPlaceStats(data);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.error('Could not fetch place stats', fetchError);
        setError('Kunne ikke hente stedsstatistikk akkurat nå.');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [API_URL, activeDhlabids, isOpen]);

  if (!isOpen) return null;

  const formatCount = (value: number | null | undefined) => (value ?? 0).toLocaleString('no-NO');

  return (
    <Rnd
      size={{ width: layout.width, height: layout.height }}
      position={{ x: layout.x, y: layout.y }}
      minWidth={300}
      minHeight={360}
      cancel=".no-drag"
      dragHandleClassName="drag-handle"
      className="visuals-card"
      style={{ zIndex: activeWindow === 'placeStats' ? 2600 : 1750 }}
      onDragStart={() => setActiveWindow('placeStats')}
      onDrag={onDrag}
      onResizeStart={() => setActiveWindow('placeStats')}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
    >
      <div className="visuals-header drag-handle" onMouseDown={() => setActiveWindow('placeStats')}>
        <div className="visuals-title">
          <i className="fas fa-chart-bar"></i> Place stats
        </div>
        <div className="visuals-controls no-drag">
          <button onClick={onClose} title="Minimer til chip">
            <i className="fas fa-window-minimize"></i>
          </button>
        </div>
      </div>

      <div className="visuals-body no-drag">
        <div className="visuals-section">
          <label>Stedsstatistikk (live)</label>
          {activeDhlabids.length === 0 ? (
            <small className="visuals-help">
              Velg et korpus for å hente stedsstatistikk.
            </small>
          ) : isLoading ? (
            <small className="visuals-help">
              Henter stedsstatistikk...
            </small>
          ) : error ? (
            <small className="visuals-help visuals-help-error">
              {error}
            </small>
          ) : placeStats ? (
            <div className="visuals-stats-block">
              <div className="visuals-stats-grid">
                <div className="visuals-stat-card">
                  <span className="visuals-stat-value">{formatCount(placeStats.totals?.uniquePlaces)}</span>
                  <span className="visuals-stat-label">Unike steder</span>
                </div>
                <div className="visuals-stat-card">
                  <span className="visuals-stat-value">{formatCount(placeStats.totals?.mentions)}</span>
                  <span className="visuals-stat-label">Mentions</span>
                </div>
                <div className="visuals-stat-card">
                  <span className="visuals-stat-value">{formatCount(placeStats.totals?.docCount)}</span>
                  <span className="visuals-stat-label">Bøker med treff</span>
                </div>
              </div>

              {Array.isArray(placeStats.kinds) && placeStats.kinds.length > 0 && (
                <div className="visuals-stats-subsection">
                  <div className="visuals-stats-subtitle">Typer steder</div>
                  <div className="visuals-stats-list">
                    {placeStats.kinds.map((row) => {
                      const share = placeStats.totals?.mentions
                        ? Math.round((row.mentions / placeStats.totals.mentions) * 100)
                        : 0;
                      const rowKind = row.kind ? String(row.kind).trim().toLowerCase() : null;
                      const isActive = !!rowKind && selectedPlaceKindFilter === rowKind;
                      return (
                        <button
                          type="button"
                          className={`visuals-stats-row visuals-stats-button ${isActive ? 'active' : ''}`}
                          key={row.kind ?? row.label ?? 'unknown'}
                          onClick={() => setSelectedPlaceKindFilter(isActive ? null : rowKind)}
                          disabled={!rowKind}
                          title={isActive ? 'Vis alle steder igjen' : 'Vis bare denne stedstypen'}
                        >
                          <div className="visuals-stats-row-main">
                            <span className="visuals-stats-row-title">{row.label || row.kind || 'Ukjent'}</span>
                            <span className="visuals-stats-row-meta">
                              {formatCount(row.uniquePlaces)} steder, {formatCount(row.mentions)} mentions
                            </span>
                          </div>
                          <div className="visuals-stats-row-share">{share}%</div>
                        </button>
                      );
                    })}
                  </div>
                  <small className="visuals-help">
                    Klikk en type for å vise bare disse stedene i kartet. Klikk igjen for å slå av filteret.
                  </small>
                </div>
              )}

              {Array.isArray(placeStats.featureCodes) && placeStats.featureCodes.length > 0 && (
                <div className="visuals-stats-subsection">
                  <div className="visuals-stats-subtitle">Topp feature codes</div>
                  <div className="visuals-stats-list">
                    {placeStats.featureCodes.map((row) => (
                      <div
                        className="visuals-stats-row visuals-stats-row-compact"
                        key={`${row.featureCode ?? 'unknown'}-${row.kind ?? 'kind'}`}
                      >
                        <div className="visuals-stats-row-main">
                          <span className="visuals-stats-row-title">{row.featureCode || 'Ukjent kode'}</span>
                          <span className="visuals-stats-row-meta">
                            {row.label || row.kind || 'Ukjent type'}
                          </span>
                        </div>
                        <div className="visuals-stats-row-share">{formatCount(row.mentions)}</div>
                      </div>
                    ))}
                  </div>
                  <small className="visuals-help">
                    `feature_class` er bevisst skjult her; denne visningen bruker totalsummer, typer og toppkoder.
                  </small>
                </div>
              )}
            </div>
          ) : (
            <small className="visuals-help">
              Ingen stedsstatistikk tilgjengelig for aktivt korpus ennå.
            </small>
          )}
        </div>
      </div>
    </Rnd>
  );
};
