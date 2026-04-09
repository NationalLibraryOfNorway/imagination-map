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
    temporalEnabled,
    temporalCutoffYear,
    temporalMode
  } = useCorpus();
  const [fullPlaces, setFullPlaces] = useState<typeof places | null>(null);
  const [firstYearByToken, setFirstYearByToken] = useState<Map<string, number> | null>(null);
  const temporalMappingReady = !temporalEnabled || firstYearByToken !== null;

  useEffect(() => {
    // Defensive cleanup: ensure circle markers from map mode do not linger visually when heatmap is active.
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });
  }, [map]);

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
        setFullPlaces(data.places || []);
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

  const points = useMemo<[number, number, number][]>(() => {
    if (!temporalMappingReady) return [];
    if (sourcePlaces.length === 0) return [];

    const temporalPlaces = sourcePlaces.filter((place) => {
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
        const isAfterOnly = temporalEnabled
          && temporalCutoffYear !== null
          && typeof firstYear === 'number'
          && firstYear >= temporalCutoffYear;
        const isUnknown = temporalEnabled
          && temporalCutoffYear !== null
          && typeof firstYear !== 'number';
        const temporalFactor = temporalEnabled && temporalMode === 'color' && (isAfterOnly || isUnknown) ? 0.18 : 1;
        const intensity = (0.2 + norm * 0.8) * temporalFactor;
        return [place.lat, place.lon, intensity];
      });
  }, [
    sourcePlaces,
    downlightPercentile,
    temporalEnabled,
    temporalCutoffYear,
    temporalMode,
    firstYearByToken,
    temporalMappingReady
  ]);

  useEffect(() => {
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
      radius: 28,
      blur: 22,
      maxZoom: 9,
      minOpacity: 0.26,
      gradient
    });

    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, downlightColorMode, lowFreqGreenStrength]);

  return null;
};
