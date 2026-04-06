import React, { useMemo } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useCorpus } from '../context/CorpusContext';

interface MapMarkersProps {
    onSelectPlace: (token: string) => void;
}

const MAP_MARKER_LIMIT = 1800;

export const MapMarkers: React.FC<MapMarkersProps> = ({ onSelectPlace }) => {
    const { places, isPlacesLoading, downlightPercentile } = useCorpus();
    const map = useMap();

    // Beregn størrelsene iterativt med np.log1p math ekvivalent for React
    const renderedMarkers = useMemo(() => {
        if (places.length === 0) return [];
        const mapPlaces = [...places]
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, MAP_MARKER_LIMIT);
        
        const frequencies = mapPlaces.map(p => p.frequency);
        const minFreq = Math.min(...frequencies);
        const maxFreq = Math.max(...frequencies);
        const logMin = Math.log1p(minFreq);
        const logMax = Math.log1p(maxFreq);
        
        // Calculate the absolute frequency threshold based on the percentile
        let thresholdFreq = 0;
        if (downlightPercentile > 0) {
           const sortedFreqs = [...frequencies].sort((a,b)=>a-b);
           const pIdx = Math.floor((downlightPercentile / 100) * (mapPlaces.length - 1));
           thresholdFreq = sortedFreqs[pIdx];
        }

        return mapPlaces.map(place => {
            // Normalisert radius
            let radius = 6;
            if (logMax > logMin) {
                const norm = (Math.log1p(place.frequency) - logMin) / (logMax - logMin);
                radius = 6 + norm * 18;
            }
            
            const isDownlighted = place.frequency <= thresholdFreq;

            return (
                <CircleMarker
                    key={place.id}
                    center={[place.lat, place.lon]}
                    radius={radius}
                    pathOptions={{ 
                        color: isDownlighted ? 'transparent' : '#dc2626', // Theme red ( Tailwind red-600)
                        fillColor: '#ef4444', 
                        fillOpacity: isDownlighted ? 0.05 : 0.6,
                        weight: isDownlighted ? 0 : 1.5
                    }}
                    eventHandlers={{
                        click: () => {
                            onSelectPlace(place.token);
                            map.panTo([place.lat, place.lon]);
                        }
                    }}
                >
                    <Tooltip sticky>
                        <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                            <strong>{place.token}</strong> {place.name ? `(${place.name})` : ''}<br />
                            Nevnt: <strong>{place.frequency.toLocaleString()}</strong> ganger<br />
                            Forekommer i: <strong>{place.doc_count.toLocaleString()}</strong> bøker
                        </div>
                    </Tooltip>
                </CircleMarker>
            );
        });
    }, [places, onSelectPlace, map, downlightPercentile]);

    if (isPlacesLoading) {
        // En elegant måte å vise kart-loading på kan implementeres
        return null;
    }

    return <>{renderedMarkers}</>;
}
