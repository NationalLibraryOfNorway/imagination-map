import { useEffect, useMemo } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useCorpus } from '../context/CorpusContext';

interface SelectedPlaceOverlayProps {
  selectedPlace: { token: string; placeId?: string } | null;
}

export const SelectedPlaceOverlay: React.FC<SelectedPlaceOverlayProps> = ({ selectedPlace }) => {
  const { places } = useCorpus();
  const map = useMap();

  const selected = useMemo(() => {
    if (!selectedPlace) return null;
    if (selectedPlace.placeId) {
      return places.find((place) => String(place.id) === String(selectedPlace.placeId)) || null;
    }
    return places.find((place) => place.token === selectedPlace.token) || null;
  }, [places, selectedPlace]);

  useEffect(() => {
    if (!selected) return;
    map.panTo([selected.lat, selected.lon], { animate: true });
  }, [map, selected]);

  if (!selected) return null;

  return (
    <CircleMarker
      center={[selected.lat, selected.lon]}
      radius={18}
      pathOptions={{
        color: '#f59e0b',
        fillColor: '#fde68a',
        fillOpacity: 0.12,
        weight: 3
      }}
      eventHandlers={{
        add: (event) => event.target.bringToFront()
      }}
    >
      <Tooltip sticky>
        <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
          <strong>Valgt sted</strong><br />
          {selected.token}
          {selected.name && selected.name !== selected.token ? ` (${selected.name})` : ''}
        </div>
      </Tooltip>
    </CircleMarker>
  );
};
