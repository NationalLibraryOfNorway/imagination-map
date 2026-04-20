import type * as L from 'leaflet';

declare module 'leaflet' {
  namespace heatLayer {
    interface HeatLayerOptions {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    }
  }

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: heatLayer.HeatLayerOptions
  ): Layer;
}
