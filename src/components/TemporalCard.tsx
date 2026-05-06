import React, { useEffect, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useCorpus } from '../context/CorpusContext';
import { useWindowLayout } from '../utils/windowLayout';
import { getFirstYearCacheForCorpus, hasFirstYearCacheForCorpus, isFirstYearFetchInFlight } from '../utils/temporal';
import './TemporalCard.css';

interface TemporalCardProps {
  isOpen: boolean;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose: () => void;
}

const normalizeTemporalPlaceId = (placeId: string): string => placeId.trim().toLowerCase();

export const TemporalCard: React.FC<TemporalCardProps> = ({
  isOpen,
  isMinimized = false,
  onMinimize,
  onClose
}) => {
  const {
    activeBooksMetadata,
    temporalEnabled,
    setTemporalEnabled,
    temporalCutoffYear,
    setTemporalCutoffYear,
    temporalMode,
    setTemporalMode,
    places,
    activeWindow,
    setActiveWindow
  } = useCorpus();

  const years = useMemo(() => activeBooksMetadata.map((b) => b.year).filter((y): y is number => y !== null), [activeBooksMetadata]);
  const minYear = years.length > 0 ? Math.min(...years) : 1800;
  const maxYear = years.length > 0 ? Math.max(...years) : 2025;
  const effectiveYear = temporalCutoffYear ?? maxYear;
  const temporalTargetPlaceIds = useMemo(
    () => Array.from(new Set(places.map((place) => normalizeTemporalPlaceId(place.id)).filter(Boolean))),
    [places]
  );
  const [isTemporalMappingComputing, setIsTemporalMappingComputing] = useState(false);
  const [firstYearByPlaceId, setFirstYearByPlaceId] = useState<Map<string, number> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { layout, onDrag, onDragStop, onResizeStop } = useWindowLayout({
    key: 'temporal',
    defaultLayout: { x: 360, y: 20, width: 420, height: 430 },
    minWidth: 300,
    minHeight: 340
  });

  useEffect(() => {
    if (temporalCutoffYear === null && years.length > 0) {
      setTemporalCutoffYear(maxYear);
    }
  }, [temporalCutoffYear, years.length, maxYear, setTemporalCutoffYear]);

  useEffect(() => {
    if (!temporalEnabled || years.length === 0 || !isPlaying) return undefined;
    const current = temporalCutoffYear ?? minYear;
    if (current >= maxYear) {
      setIsPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const next = Math.min(maxYear, current + 1);
      setTemporalCutoffYear(next);
      if (next >= maxYear) setIsPlaying(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [temporalEnabled, years.length, isPlaying, temporalCutoffYear, minYear, maxYear, setTemporalCutoffYear]);

  useEffect(() => {
    if (!temporalEnabled) setIsPlaying(false);
  }, [temporalEnabled]);

  useEffect(() => {
    if (isOpen && !temporalEnabled) {
      setTemporalEnabled(true);
    }
  }, [isOpen, temporalEnabled, setTemporalEnabled]);

  useEffect(() => {
    if (!isOpen || !temporalEnabled || activeBooksMetadata.length === 0) {
      setFirstYearByPlaceId(null);
      return undefined;
    }

    const syncFromCache = () => {
      const cached = getFirstYearCacheForCorpus(activeBooksMetadata, temporalTargetPlaceIds);
      setFirstYearByPlaceId(cached);
    };

    syncFromCache();
    const timer = window.setInterval(syncFromCache, 250);
    return () => window.clearInterval(timer);
  }, [isOpen, temporalEnabled, activeBooksMetadata, temporalTargetPlaceIds]);

  useEffect(() => {
    if (!isOpen || !temporalEnabled) {
      setIsTemporalMappingComputing(false);
      return undefined;
    }

    const updateStatus = () => {
      const hasCache = hasFirstYearCacheForCorpus(activeBooksMetadata, temporalTargetPlaceIds);
      const inflight = isFirstYearFetchInFlight(activeBooksMetadata, temporalTargetPlaceIds);
      setIsTemporalMappingComputing(!hasCache && inflight);
    };

    updateStatus();
    const timer = window.setInterval(updateStatus, 250);
    return () => window.clearInterval(timer);
  }, [isOpen, temporalEnabled, activeBooksMetadata, temporalTargetPlaceIds]);

  const cumulativeSeries = useMemo(() => {
    if (!firstYearByPlaceId || minYear > maxYear) return [] as Array<{ year: number; cumulative: number }>;
    const yearlyCounts = new Map<number, number>();
    firstYearByPlaceId.forEach((year) => {
      if (!Number.isFinite(year)) return;
      const y = Math.round(year);
      if (y < minYear || y > maxYear) return;
      yearlyCounts.set(y, (yearlyCounts.get(y) || 0) + 1);
    });

    let running = 0;
    const points: Array<{ year: number; cumulative: number }> = [];
    for (let y = minYear; y <= maxYear; y += 1) {
      running += yearlyCounts.get(y) || 0;
      points.push({ year: y, cumulative: running });
    }
    return points;
  }, [firstYearByPlaceId, minYear, maxYear]);

  const chartGeometry = useMemo(() => {
    const width = 320;
    const height = 120;
    const padding = { top: 10, right: 12, bottom: 20, left: 36 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const yMax = Math.max(1, cumulativeSeries[cumulativeSeries.length - 1]?.cumulative || 0);
    const startValue = cumulativeSeries[0]?.cumulative || 0;
    const xSpan = Math.max(1, maxYear - minYear);
    const xForYear = (year: number) => padding.left + ((year - minYear) / xSpan) * innerWidth;
    const yForValue = (value: number) => padding.top + (1 - (value / yMax)) * innerHeight;
    const yMid = Math.round(yMax / 2);
    const path = cumulativeSeries
      .map((point, i) => `${i === 0 ? 'M' : 'L'}${xForYear(point.year).toFixed(2)},${yForValue(point.cumulative).toFixed(2)}`)
      .join(' ');
    const cutoffX = xForYear(Math.min(maxYear, Math.max(minYear, effectiveYear)));
    return {
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      yMax,
      yMid,
      startValue,
      xForYear,
      yForValue,
      path,
      cutoffX
    };
  }, [cumulativeSeries, minYear, maxYear, effectiveYear]);

  if (!isOpen || isMinimized) return null;

  return (
    <Rnd
      size={{ width: layout.width, height: layout.height }}
      position={{ x: layout.x, y: layout.y }}
      minWidth={300}
      minHeight={340}
      cancel=".no-drag"
      dragHandleClassName="drag-handle"
      className="temporal-card"
      style={{ zIndex: activeWindow === 'temporal' ? 2600 : 1750 }}
      onDragStart={() => setActiveWindow('temporal')}
      onDrag={onDrag}
      onResizeStart={() => setActiveWindow('temporal')}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
    >
      <div className="temporal-header drag-handle" onMouseDown={() => setActiveWindow('temporal')}>
        <div className="temporal-title">
          <i className="fas fa-calendar-alt"></i> Tidsvisning
        </div>
        <div className="temporal-controls no-drag window-header-controls">
          <button className="window-header-button" onClick={() => (onMinimize ? onMinimize() : onClose())} title="Minimer">
            <i className="fas fa-window-minimize"></i>
          </button>
          <button className="window-header-button" onClick={onClose} title="Lukk">
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div className="temporal-body no-drag">
        <div className="temporal-section">
          <div className="temporal-year-header">
            <label>År</label>
            <div className="temporal-year-display" aria-live="polite">{effectiveYear}</div>
          </div>
          <div style={{ padding: '0 8px' }}>
            <Slider
              min={minYear}
              max={maxYear}
              value={effectiveYear}
              onChange={(val) => {
                setTemporalCutoffYear(val as number);
                if (!temporalEnabled) setTemporalEnabled(true);
              }}
            />
          </div>
          <div className="temporal-range">
            <span>{minYear}</span>
            <span>{maxYear}</span>
          </div>
          <div className="temporal-play-row">
            <button
              type="button"
              className={`temporal-play-btn ${isPlaying ? 'active' : ''}`}
              onClick={() => {
                if (!temporalEnabled) setTemporalEnabled(true);
                if ((temporalCutoffYear ?? minYear) >= maxYear) {
                  setTemporalCutoffYear(minYear);
                }
                setIsPlaying((v) => !v);
              }}
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="temporal-play-btn"
              onClick={() => {
                setIsPlaying(false);
                setTemporalCutoffYear(minYear);
                if (!temporalEnabled) setTemporalEnabled(true);
              }}
            >
              <i className="fas fa-undo"></i>
              Til start
            </button>
          </div>
        </div>

        <div className="temporal-section">
          <label>Kumulativ utvikling i steder</label>
          <div className="temporal-chart-shell">
            {cumulativeSeries.length === 0 ? (
              <div className="temporal-chart-empty">Ingen tidsdata tilgjengelig ennå.</div>
            ) : (
              <>
                <svg
                  className="temporal-chart"
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  role="img"
                  aria-label="Kumulativt antall steder per år"
                >
                  <line
                    x1={chartGeometry.padding.left}
                    y1={chartGeometry.height - chartGeometry.padding.bottom}
                    x2={chartGeometry.width - chartGeometry.padding.right}
                    y2={chartGeometry.height - chartGeometry.padding.bottom}
                    className="temporal-chart-axis"
                  />
                  <line
                    x1={chartGeometry.padding.left}
                    y1={chartGeometry.padding.top}
                    x2={chartGeometry.padding.left}
                    y2={chartGeometry.height - chartGeometry.padding.bottom}
                    className="temporal-chart-axis"
                  />
                  <line
                    x1={chartGeometry.padding.left}
                    y1={chartGeometry.yForValue(0)}
                    x2={chartGeometry.width - chartGeometry.padding.right}
                    y2={chartGeometry.yForValue(0)}
                    className="temporal-chart-grid"
                  />
                  <line
                    x1={chartGeometry.padding.left}
                    y1={chartGeometry.yForValue(chartGeometry.yMax)}
                    x2={chartGeometry.width - chartGeometry.padding.right}
                    y2={chartGeometry.yForValue(chartGeometry.yMax)}
                    className="temporal-chart-grid"
                  />
                  <line
                    x1={chartGeometry.padding.left}
                    y1={chartGeometry.yForValue(chartGeometry.yMid)}
                    x2={chartGeometry.width - chartGeometry.padding.right}
                    y2={chartGeometry.yForValue(chartGeometry.yMid)}
                    className="temporal-chart-grid"
                  />
                  {chartGeometry.startValue > 0 && chartGeometry.startValue !== chartGeometry.yMid && chartGeometry.startValue !== chartGeometry.yMax && (
                    <line
                      x1={chartGeometry.padding.left}
                      y1={chartGeometry.yForValue(chartGeometry.startValue)}
                      x2={chartGeometry.width - chartGeometry.padding.right}
                      y2={chartGeometry.yForValue(chartGeometry.startValue)}
                      className="temporal-chart-grid temporal-chart-grid--start"
                    />
                  )}
                  <text
                    x={chartGeometry.padding.left - 6}
                    y={chartGeometry.yForValue(chartGeometry.yMax) + 3}
                    textAnchor="end"
                    className="temporal-chart-tick"
                  >
                    {chartGeometry.yMax.toLocaleString()}
                  </text>
                  <text
                    x={chartGeometry.padding.left - 6}
                    y={chartGeometry.yForValue(chartGeometry.yMid) + 3}
                    textAnchor="end"
                    className="temporal-chart-tick"
                  >
                    {chartGeometry.yMid.toLocaleString()}
                  </text>
                  <text
                    x={chartGeometry.padding.left - 6}
                    y={chartGeometry.yForValue(0) + 3}
                    textAnchor="end"
                    className="temporal-chart-tick"
                  >
                    0
                  </text>
                  {chartGeometry.startValue > 0 && chartGeometry.startValue !== chartGeometry.yMid && chartGeometry.startValue !== chartGeometry.yMax && (
                    <text
                      x={chartGeometry.padding.left - 6}
                      y={chartGeometry.yForValue(chartGeometry.startValue) + 3}
                      textAnchor="end"
                      className="temporal-chart-tick temporal-chart-tick--start"
                    >
                      {chartGeometry.startValue.toLocaleString()}
                    </text>
                  )}
                  <line
                    x1={chartGeometry.cutoffX}
                    y1={chartGeometry.padding.top}
                    x2={chartGeometry.cutoffX}
                    y2={chartGeometry.height - chartGeometry.padding.bottom}
                    className="temporal-chart-cutoff"
                  />
                  <path d={chartGeometry.path} className="temporal-chart-line" />
                  <circle
                    cx={chartGeometry.xForYear(minYear)}
                    cy={chartGeometry.yForValue(chartGeometry.startValue)}
                    r={2.4}
                    className="temporal-chart-start-point"
                  />
                </svg>
                <div className="temporal-chart-legend">
                  <span>Start ({minYear}): {chartGeometry.startValue.toLocaleString()}</span>
                  <span>Y: 0-{chartGeometry.yMax.toLocaleString()} steder (kumulativt)</span>
                  <span>År: {effectiveYear}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="temporal-section temporal-mode-row">
          <button type="button" className={temporalMode === 'color' ? 'active' : ''} onClick={() => setTemporalMode('color')}>
            Farge
          </button>
          <button type="button" className={temporalMode === 'toggle' ? 'active' : ''} onClick={() => setTemporalMode('toggle')}>
            Av/på
          </button>
        </div>
        {isTemporalMappingComputing && (
          <div className="temporal-computing-hint">
            <i className="fas fa-circle-notch fa-spin"></i> Beregner tidsmapping...
          </div>
        )}
      </div>
    </Rnd>
  );
};
