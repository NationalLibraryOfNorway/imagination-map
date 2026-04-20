import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useCorpus } from '../context/CorpusContext';
import { mixHex } from '../utils/colors';
import { fetchFirstYearByTokenForCorpus } from '../utils/temporal';

interface HeatmapLayerProps {
  useFullDataset?: boolean;
}

const normalizePlaces = (rows: any[]): any[] =>
  (rows || [])
    .map((row) => ({
      ...row,
      id: row?.nb_place_id ?? row?.id,
      token: row?.token ?? row?.historical_name ?? row?.name,
      name: row?.name ?? row?.modern_name ?? row?.token ?? null,
      lat: Number(row?.lat ?? row?.latitude),
      lon: Number(row?.lon ?? row?.longitude),
      frequency: Number(row?.frequency ?? row?.mentions ?? row?.count) || 0,
      doc_count: Number(row?.doc_count ?? row?.book_count ?? row?.docs) || 0
    }))
    .filter((row) => row.id !== undefined && row.token && Number.isFinite(row.lat) && Number.isFinite(row.lon));

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ useFullDataset = false }) => {
  const map = useMap();
  const {
    places,
    totalPlaces,
    activeDhlabids,
    activeBooksMetadata,
    API_URL,
    maxPlacesInView,
    downlightPercentile,
    downlightColorMode,
    lowFreqGreenStrength,
    heatmapStrength,
    temporalEnabled,
    temporalCutoffYear,
    temporalMode,
    compareSegmentsEnabled,
    segmentABookIds,
    segmentBBookIds
  } = useCorpus();
  const [fullPlaces, setFullPlaces] = useState<typeof places | null>(null);
  const [comparePlaces, setComparePlaces] = useState<{ A: typeof places; B: typeof places } | null>(null);
  const [firstYearByToken, setFirstYearByToken] = useState<Map<string, number> | null>(null);
  const temporalMappingReady = !temporalEnabled || firstYearByToken !== null;
  const compareReady = compareSegmentsEnabled && segmentABookIds.length > 0 && segmentBBookIds.length > 0;
  const heatStrength = Math.max(0.5, Math.min(3, heatmapStrength / 100));
  const boostIntensity = (value: number): number => {
    const i = Math.max(0, Math.min(1, value));
    if (heatStrength === 1) return i;
    if (heatStrength > 1) return 1 - Math.pow(1 - i, heatStrength);
    return Math.pow(i, 1 / heatStrength);
  };

  useEffect(() => {
    // Defensive cleanup: ensure circle markers from map mode do not linger visually when heatmap is active.
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });
  }, [map]);

  useEffect(() => {
    if (!compareReady) {
      setComparePlaces(null);
      return;
    }
    let cancelled = false;
    const fetchPlacesForSegment = async (ids: number[]) => {
      const res = await fetch(`${API_URL}/api/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dhlabids: ids,
          maxPlaces: maxPlacesInView
        })
      });
      if (!res.ok) throw new Error('Failed to fetch segment places for heatmap compare');
      const data = await res.json();
      return normalizePlaces(data.places || []);
    };
    const run = async () => {
      const [placesA, placesB] = await Promise.all([
        fetchPlacesForSegment(segmentABookIds),
        fetchPlacesForSegment(segmentBBookIds)
      ]);
      if (cancelled) return;
      setComparePlaces({ A: placesA, B: placesB });
    };
    run().catch((err) => {
      if (cancelled) return;
      console.error(err);
      setComparePlaces(null);
    });
    return () => {
      cancelled = true;
    };
  }, [compareReady, segmentABookIds, segmentBBookIds, API_URL, maxPlacesInView]);

  useEffect(() => {
    if (!useFullDataset) return;
    if (activeDhlabids.length === 0) {
      setFullPlaces([]);
      return;
    }
    if (totalPlaces <= places.length) {
      setFullPlaces(places);
      return;
    }

    let cancelled = false;
    fetch(`${API_URL}/api/places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dhlabids: activeDhlabids,
        maxPlaces: totalPlaces
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch full places set for heatmap');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setFullPlaces(normalizePlaces(data.places || []));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setFullPlaces(places);
      });

    return () => {
      cancelled = true;
    };
  }, [useFullDataset, activeDhlabids, totalPlaces, places, API_URL]);

  const sourcePlaces = useFullDataset ? (fullPlaces || places) : places;
  useEffect(() => {
    if (!temporalEnabled) {
      setFirstYearByToken(null);
      return;
    }

    // Avoid rendering with stale year mapping while recomputing.
    setFirstYearByToken(null);
    let cancelled = false;
    const run = async () => {
      const firstSeen = await fetchFirstYearByTokenForCorpus({
        apiUrl: API_URL,
        activeBooksMetadata,
        maxPlacesInView,
        totalPlaces
      });
      if (!cancelled) setFirstYearByToken(firstSeen);
    };

    run().catch((err) => {
      if (cancelled) return;
      console.error(err);
      setFirstYearByToken(null);
    });

    return () => {
      cancelled = true;
    };
  }, [temporalEnabled, activeBooksMetadata, API_URL, maxPlacesInView, totalPlaces]);

  const toHeatPoints = (inputPlaces: typeof places, opts?: { ignoreTemporal?: boolean }): [number, number, number][] => {
    if (!temporalMappingReady) return [];
    if (inputPlaces.length === 0) return [];
    const ignoreTemporal = opts?.ignoreTemporal === true;

    const temporalPlaces = inputPlaces.filter((place) => {
      if (ignoreTemporal) return true;
      if (!temporalEnabled || temporalCutoffYear === null) return true;
      const firstYear = firstYearByToken?.get(place.token);
      const isAfterOnly = typeof firstYear === 'number' && firstYear >= temporalCutoffYear;
      const isUnknown = typeof firstYear !== 'number';
      if (temporalMode === 'toggle') {
        return !(isAfterOnly || isUnknown);
      }
      return true;
    });

    if (temporalPlaces.length === 0) return [];
    const frequencies = temporalPlaces.map((place) => place.frequency);
    const sortedFreqs = [...frequencies].sort((a, b) => a - b);
    const thresholdIdx = Math.floor((downlightPercentile / 100) * Math.max(0, temporalPlaces.length - 1));
    const thresholdFreq = downlightPercentile > 0 ? sortedFreqs[thresholdIdx] : 0;
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    const logMax = Math.log1p(maxFreq);
    const logMin = Math.log1p(minFreq);

    return temporalPlaces
      .filter((place) => place.frequency > thresholdFreq)
      .map((place) => {
        const norm = logMax > logMin
          ? (Math.log1p(place.frequency) - logMin) / (logMax - logMin)
          : 0.35;
        const firstYear = firstYearByToken?.get(place.token);
        if (ignoreTemporal) {
          const intensity = boostIntensity(0.2 + norm * 0.8);
          return [place.lat, place.lon, intensity];
        }
        const isAfterOnly = temporalEnabled
          && temporalCutoffYear !== null
          && typeof firstYear === 'number'
          && firstYear >= temporalCutoffYear;
        const isUnknown = temporalEnabled
          && temporalCutoffYear !== null
          && typeof firstYear !== 'number';
        const temporalFactor = temporalEnabled && temporalMode === 'color' && (isAfterOnly || isUnknown) ? 0.18 : 1;
        const intensity = boostIntensity((0.2 + norm * 0.8) * temporalFactor);
        return [place.lat, place.lon, intensity];
      });
  };

  const points = useMemo<[number, number, number][]>(() => {
    return toHeatPoints(sourcePlaces);
  }, [
    sourcePlaces,
    downlightPercentile,
    temporalEnabled,
    temporalCutoffYear,
    temporalMode,
    firstYearByToken,
    temporalMappingReady
  ]);

  const comparePointsA = useMemo<[number, number, number][]>(() => {
    if (!compareReady || !comparePlaces) return [];
    return toHeatPoints(comparePlaces.A, { ignoreTemporal: true });
  }, [compareReady, comparePlaces, downlightPercentile, temporalEnabled, temporalCutoffYear, temporalMode, firstYearByToken, temporalMappingReady]);

  const comparePointsB = useMemo<[number, number, number][]>(() => {
    if (!compareReady || !comparePlaces) return [];
    return toHeatPoints(comparePlaces.B, { ignoreTemporal: true });
  }, [compareReady, comparePlaces, downlightPercentile, temporalEnabled, temporalCutoffYear, temporalMode, firstYearByToken, temporalMappingReady]);

  useEffect(() => {
    if (compareReady) {
      if (comparePointsA.length === 0 && comparePointsB.length === 0) return;
      const gradientA = {
        0.2: 'rgba(219, 234, 254, 0.24)',
        0.55: 'rgba(96, 165, 250, 0.56)',
        1.0: 'rgba(30, 58, 138, 0.82)'
      };
      const gradientB = {
        0.2: 'rgba(254, 226, 226, 0.18)',
        0.55: 'rgba(248, 113, 113, 0.42)',
        1.0: 'rgba(153, 27, 27, 0.72)'
      };
      const heatLayerA = (L as any).heatLayer(comparePointsA, {
        radius: Math.round(16 + 12 * heatStrength),
        blur: Math.round(14 + 8 * heatStrength),
        maxZoom: 9,
        minOpacity: Math.min(0.45, 0.1 + 0.08 * heatStrength),
        gradient: gradientA
      });
      const heatLayerB = (L as any).heatLayer(comparePointsB, {
        radius: Math.round(16 + 12 * heatStrength),
        blur: Math.round(14 + 8 * heatStrength),
        maxZoom: 9,
        minOpacity: Math.min(0.45, 0.12 + 0.09 * heatStrength),
        gradient: gradientB
      });
      heatLayerA.addTo(map);
      heatLayerB.addTo(map);
      return () => {
        map.removeLayer(heatLayerA);
        map.removeLayer(heatLayerB);
      };
    }

    if (points.length === 0) return;

    const greenRatio = lowFreqGreenStrength / 100;
    const baseLow = downlightColorMode === 'red' ? '#fee2e2' : '#dbeafe';
    const baseMid = downlightColorMode === 'red' ? '#f87171' : '#60a5fa';
    const baseHigh = downlightColorMode === 'red' ? '#991b1b' : '#1e3a8a';
    const greenLow = '#bbf7d0';
    const greenMid = '#22c55e';

    const gradient = {
      0.2: mixHex(baseLow, greenLow, greenRatio),
      0.55: mixHex(baseMid, greenMid, greenRatio * 0.8),
      1.0: baseHigh
    };

    const heatLayer = (L as any).heatLayer(points, {
      radius: Math.round(16 + 12 * heatStrength),
      blur: Math.round(14 + 8 * heatStrength),
      maxZoom: 9,
      minOpacity: Math.min(0.5, 0.16 + 0.1 * heatStrength),
      gradient
    });

    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, downlightColorMode, lowFreqGreenStrength, compareReady, comparePointsA, comparePointsB, heatStrength]);

  return null;
};
