/**
 * Map component enhancement utilities for XCON.
 *
 * The @xcon-viewer/viewer already renders map components with Leaflet CDN.
 * This module provides additional layer types that can be applied after
 * the base map is rendered:
 *
 *   - Heatmap layer (leaflet.heat)
 *   - Marker clustering (leaflet.markercluster)
 *   - Polyline / Polygon overlays
 *   - Custom marker icons
 *
 * These enhancements are applied to an existing Leaflet map instance
 * that the viewer has already created.
 */

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity?: number;
}

export interface PolylinePoint {
  lat: number;
  lng: number;
}

export interface MapEnhancerConfig {
  heatmap?: {
    points: HeatmapPoint[];
    radius?: number;
    blur?: number;
    maxZoom?: number;
    gradient?: Record<string, string>;
  };
  polylines?: Array<{
    points: PolylinePoint[];
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
    label?: string;
  }>;
  polygons?: Array<{
    points: PolylinePoint[];
    fillColor?: string;
    fillOpacity?: number;
    color?: string;
    weight?: number;
    label?: string;
  }>;
  clustering?: {
    enabled: boolean;
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
  };
}

export async function applyMapEnhancements(mapContainer: HTMLElement, config: MapEnhancerConfig): Promise<void> {
  const L = (window as any).L;
  if (!L) return;

  const mapInstance = (mapContainer as any)._leaflet_map || findLeafletMap(mapContainer);
  if (!mapInstance) return;

  if (config.heatmap?.points?.length) {
    try {
      await loadLeafletHeat();
      const heatData = config.heatmap.points.map((p) => [p.lat, p.lng, p.intensity ?? 1]);
      (L as any)
        .heatLayer(heatData, {
          radius: config.heatmap.radius ?? 25,
          blur: config.heatmap.blur ?? 15,
          maxZoom: config.heatmap.maxZoom ?? 17,
          gradient: config.heatmap.gradient,
        })
        .addTo(mapInstance);
    } catch {
      /* leaflet.heat not available */
    }
  }

  if (config.polylines?.length) {
    for (const line of config.polylines) {
      const latlngs = line.points.map((p) => [p.lat, p.lng]);
      L.polyline(latlngs, {
        color: line.color ?? '#2563eb',
        weight: line.weight ?? 3,
        opacity: line.opacity ?? 0.8,
        dashArray: line.dashArray,
      })
        .addTo(mapInstance)
        .bindTooltip(line.label ?? '');
    }
  }

  if (config.polygons?.length) {
    for (const poly of config.polygons) {
      const latlngs = poly.points.map((p) => [p.lat, p.lng]);
      L.polygon(latlngs, {
        fillColor: poly.fillColor ?? '#2563eb',
        fillOpacity: poly.fillOpacity ?? 0.3,
        color: poly.color ?? '#1d4ed8',
        weight: poly.weight ?? 2,
      })
        .addTo(mapInstance)
        .bindTooltip(poly.label ?? '');
    }
  }

  if (config.clustering?.enabled) {
    try {
      await loadMarkerCluster();
      const group = (L as any).markerClusterGroup({
        maxClusterRadius: config.clustering.maxClusterRadius ?? 80,
        spiderfyOnMaxZoom: config.clustering.spiderfyOnMaxZoom ?? true,
      });
      const existingMarkers: any[] = [];
      mapInstance.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) existingMarkers.push(layer);
      });
      for (const marker of existingMarkers) {
        mapInstance.removeLayer(marker);
        group.addLayer(marker);
      }
      mapInstance.addLayer(group);
    } catch {
      /* markercluster not available */
    }
  }
}

function findLeafletMap(container: HTMLElement): any {
  const L = (window as any).L;
  if (!L) return null;
  const mapDiv = container.querySelector('.xa-map, .leaflet-container') as HTMLElement | null;
  return mapDiv ? (mapDiv as any)._leaflet_map || (L as any).map?.(mapDiv) : null;
}

let heatLoaded = false;
async function loadLeafletHeat(): Promise<void> {
  if (heatLoaded) return;
  try {
    await import('leaflet.heat');
    heatLoaded = true;
  } catch {
    /* not available */
  }
}

let clusterLoaded = false;
async function loadMarkerCluster(): Promise<void> {
  if (clusterLoaded) return;
  try {
    await import('leaflet.markercluster');
    clusterLoaded = true;
  } catch {
    /* not available */
  }
}
