import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { useCorpus } from '../context/CorpusContext';
import { useWindowLayout } from '../utils/windowLayout';
import './SettingsCard.css';

interface PlaceQaSurface {
  surface: string;
  mentions: number;
}

interface PlaceQaMatch {
  id: string;
  canonicalName: string;
  matchedForm?: string | null;
  alternateForms?: string[];
  country?: string | null;
  lat?: number | null;
  lon?: number | null;
  featureCode?: string | null;
  featureClass?: string | null;
  kind?: string | null;
  placeMentions: number;
  surfacePlaceMentions?: number;
  docCount: number;
  docCoverageRate: number;
  wordFrequency?: number;
  nonPlaceWordFrequency?: number;
  surfaceTagRatio?: number;
  topSurfaces?: PlaceQaSurface[];
}

interface PlaceQaResponse {
  corpus: {
    booksInCorpus: number;
    booksWithGeo: number;
    coverageRate: number;
    totalGeoMentions: number;
    uniquePlaces: number;
    queryWordFrequency?: number;
    queryTaggedSurfaceMentions?: number;
    queryNonPlaceWordFrequency?: number;
    querySurfaceTagRatio?: number;
  };
  matches: PlaceQaMatch[];
}

interface PlaceQaCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlaceQaCard: React.FC<PlaceQaCardProps> = ({ isOpen, onClose }) => {
  const {
    activeWindow,
    setActiveWindow,
    activeDhlabids,
    API_URL
  } = useCorpus();
  const [qaMode, setQaMode] = useState<'query' | 'id'>('query');
  const [qaValue, setQaValue] = useState('');
  const [qaResult, setQaResult] = useState<PlaceQaResponse | null>(null);
  const [qaError, setQaError] = useState<string | null>(null);
  const [isQaLoading, setIsQaLoading] = useState(false);
  const { layout, onDrag, onDragStop, onResizeStop } = useWindowLayout({
    key: 'place-qa',
    defaultLayout: { x: 380, y: 260, width: 420, height: 560 },
    minWidth: 320,
    minHeight: 360
  });

  const formatPercent = (value: number | null | undefined) => {
    if (!Number.isFinite(value)) return '0 %';
    return `${((value ?? 0) * 100).toFixed(1)} %`;
  };

  const handleRunQa = async () => {
    const trimmed = qaValue.trim();
    if (!trimmed) {
      setQaError(qaMode === 'query' ? 'Skriv inn et ord eller stedsnavn.' : 'Skriv inn en sted-ID.');
      setQaResult(null);
      return;
    }
    if (activeDhlabids.length === 0) {
      setQaError('Velg et aktivt korpus først.');
      setQaResult(null);
      return;
    }

    setIsQaLoading(true);
    setQaError(null);
    try {
      const payload: Record<string, unknown> = {
        dhlabids: activeDhlabids,
        maxSurfaces: 5
      };
      if (qaMode === 'query') {
        payload.query = trimmed;
        payload.limit = 5;
      } else {
        payload.id = trimmed;
      }

      const res = await fetch(`${API_URL}/api/place/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json() as PlaceQaResponse;
      setQaResult(data);
    } catch (error) {
      console.error(error);
      setQaResult(null);
      setQaError('Kunne ikke hente QA for sted vs ord akkurat nå.');
    } finally {
      setIsQaLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Rnd
      size={{ width: layout.width, height: layout.height }}
      position={{ x: layout.x, y: layout.y }}
      minWidth={320}
      minHeight={360}
      cancel=".no-drag"
      dragHandleClassName="drag-handle"
      className="settings-card"
      style={{ zIndex: activeWindow === 'placeQa' ? 2600 : 1750 }}
      onDragStart={() => setActiveWindow('placeQa')}
      onDrag={onDrag}
      onResizeStart={() => setActiveWindow('placeQa')}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
    >
      <div className="settings-header drag-handle" onMouseDown={() => setActiveWindow('placeQa')}>
        <div className="settings-title">
          <i className="fas fa-vial"></i> Tell sted vs ord
        </div>
        <div className="settings-controls no-drag">
          <button onClick={onClose} title="Minimer til chip">
            <i className="fas fa-window-minimize"></i>
          </button>
        </div>
      </div>

      <div className="settings-body no-drag">
        <div className="settings-section">
          <label>Tell sted vs ord</label>
          <div className="settings-toggle-row">
            <button
              type="button"
              className={`settings-toggle ${qaMode === 'query' ? 'active' : ''}`}
              onClick={() => setQaMode('query')}
            >
              Ord
            </button>
            <button
              type="button"
              className={`settings-toggle ${qaMode === 'id' ? 'active' : ''}`}
              onClick={() => setQaMode('id')}
            >
              Steds-ID
            </button>
          </div>
          <div className="settings-tool-row">
            <input
              className="settings-input"
              placeholder={qaMode === 'query' ? 'f.eks. Bergen' : 'f.eks. 3161732'}
              value={qaValue}
              onChange={(e) => setQaValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleRunQa();
              }}
            />
            <button
              type="button"
              className="settings-action"
              onClick={() => void handleRunQa()}
              disabled={isQaLoading}
            >
              {isQaLoading ? 'Kjører...' : 'Kjør'}
            </button>
          </div>
          <small className="settings-help">
            Sammenligner hvor ofte en ordform er geo-tagget mot hvor ofte den opptrer som vanlig ord i aktivt korpus.
          </small>

          {qaError && <div className="settings-inline-error">{qaError}</div>}

          {qaResult && (
            <div className="settings-qa-result">
              <div className="settings-qa-grid">
                <div className="settings-qa-card">
                  <span className="settings-qa-value">{qaResult.corpus.booksInCorpus.toLocaleString('no-NO')}</span>
                  <span className="settings-qa-label">Bøker i korpus</span>
                </div>
                <div className="settings-qa-card">
                  <span className="settings-qa-value">{formatPercent(qaResult.corpus.coverageRate)}</span>
                  <span className="settings-qa-label">Dekning geo</span>
                  <span className="settings-qa-note">
                    bøker med geo: {qaResult.corpus.booksWithGeo.toLocaleString('no-NO')} / {qaResult.corpus.booksInCorpus.toLocaleString('no-NO')}
                  </span>
                </div>
                <div className="settings-qa-card">
                  <span className="settings-qa-value">{qaResult.corpus.uniquePlaces.toLocaleString('no-NO')}</span>
                  <span className="settings-qa-label">Unike steder</span>
                </div>
              </div>

              {qaMode === 'query' && (
                <div className="settings-qa-summary">
                  <div><strong>Ordtreff:</strong> {(qaResult.corpus.queryWordFrequency ?? 0).toLocaleString('no-NO')}</div>
                  <div><strong>Tagget som sted:</strong> {(qaResult.corpus.queryTaggedSurfaceMentions ?? 0).toLocaleString('no-NO')}</div>
                  <div><strong>Utagget:</strong> {(qaResult.corpus.queryNonPlaceWordFrequency ?? 0).toLocaleString('no-NO')}</div>
                  <div><strong>Tag-ratio:</strong> {formatPercent(qaResult.corpus.querySurfaceTagRatio)}</div>
                </div>
              )}

              <div className="settings-qa-subtitle">Kandidater</div>
              <div className="settings-qa-list">
                {qaResult.matches.length === 0 && (
                  <div className="settings-help">Ingen stedskandidater for dette oppslaget.</div>
                )}
                {qaResult.matches.map((match) => (
                  <div className="settings-qa-match" key={match.id}>
                    <div className="settings-qa-match-head">
                      <div>
                        <strong>{match.canonicalName}</strong>
                        {match.matchedForm && match.matchedForm !== match.canonicalName && (
                          <span className="settings-qa-muted"> via {match.matchedForm}</span>
                        )}
                      </div>
                      <div className="settings-qa-code">
                        {match.kind || 'ukjent'} {match.featureCode ? `· ${match.featureCode}` : ''}
                      </div>
                    </div>
                    <div className="settings-qa-summary">
                      <div><strong>Place mentions:</strong> {match.placeMentions.toLocaleString('no-NO')}</div>
                      <div><strong>Bøker:</strong> {match.docCount.toLocaleString('no-NO')} ({formatPercent(match.docCoverageRate)})</div>
                      <div><strong>Ordfrekvens:</strong> {(match.wordFrequency ?? 0).toLocaleString('no-NO')}</div>
                      <div><strong>Tag-ratio:</strong> {formatPercent(match.surfaceTagRatio)}</div>
                    </div>
                    {Array.isArray(match.topSurfaces) && match.topSurfaces.length > 0 && (
                      <div className="settings-qa-surfaces">
                        {match.topSurfaces.map((surface) => (
                          <span className="settings-qa-surface" key={`${match.id}-${surface.surface}`}>
                            {surface.surface} ({surface.mentions.toLocaleString('no-NO')})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
};
