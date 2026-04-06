import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useCorpus } from '../context/CorpusContext';

export const HeatmapLayer: React.FC = () => {
  const map = useMap();
  const { places, downlightPercentile } = useCorpus();

  const points = useMemo<[number, number, number][]>(() => {
    if (places.length === 0) return [];

    const frequencies = places.map((place) => place.frequency);
    const sortedFreqs = [...frequencies].sort((a, b) => a - b);
    const thresholdIdx = Math.floor((downlightPercentile / 100) * Math.max(0, places.length - 1));
    const thresholdFreq = downlightPercentile > 0 ? sortedFreqs[thresholdIdx] : 0;
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    const logMax = Math.log1p(maxFreq);
    const logMin = Math.log1p(minFreq);

    return places
      .filter((place) => place.frequency > thresholdFreq)
      .map((place) => {
        const norm = logMax > logMin
          ? (Math.log1p(place.frequency) - logMin) / (logMax - logMin)
          : 0.35;
        const intensity = 0.2 + norm * 0.8;
        return [place.lat, place.lon, intensity];
      });
  }, [places, downlightPercentile]);

  useEffect(() => {
    if (points.length === 0) return;

    const heatLayer = (L as any).heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 9,
      minOpacity: 0.26,
      gradient: {
        0.2: '#3b82f6',
        0.4: '#06b6d4',
        0.6: '#22c55e',
        0.78: '#f59e0b',
        1.0: '#ef4444'
      }
    });

    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};
