
import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { PollutionData, SatellitePosition } from '../types';

interface MapComponentProps {
  satellitePosition: SatellitePosition;
  pollutionData: PollutionData[];
}

// Satellite Icon SVG
const satelliteSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256">
  <path fill="currentColor" d="M239.86,183.21,180.3,123.65a20,20,0,0,0-28.29,0l-16,16-36.7-36.71a44,44,0,0,0-62.24,0,43.43,43.43,0,0,0-12.1,28.85L5.42,151.34A20,20,0,0,0,2.6,177.17l29.4,56.83a20,20,0,0,0,25.82,12.83L77.38,241.4a43.43,43.43,0,0,0,28.85-12.1,44,44,0,0,0,0-62.24l36.71-36.7,16,16a20,20,0,0,0,28.29,0l59.56-59.56a20,20,0,0,0,0-28.28ZM101.46,212.54a28,28,0,0,1-39.6,0L24.5,175.18,44,136.25l29.43,29.43a20,20,0,0,0,28.28,0L118,149.37l16.88,16.87ZM88,128,58.57,98.57,97.5,79.14Zm120-47.31-16,16L182,86.63,152.57,57.2,168.9,40.88a4,4,0,0,1,5.66,0l41.29,41.29a4,4,0,0,1,0,5.66Z"/>
</svg>
`;

const satelliteIcon = L.divIcon({
  html: satelliteSVG,
  className: 'text-cyan-400',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const MapComponent: React.FC<MapComponentProps> = ({ satellitePosition, pollutionData }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const satelliteMarkerRef = useRef<L.Marker | null>(null);
  const pollutionLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [80, 0],
        zoom: 4,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);
      
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
      pollutionLayerRef.current = L.layerGroup().addTo(map);
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // FIX: Corrected the setView options. The 'pan' property is invalid; animation duration is set directly with the 'duration' property.
    map.setView([satellitePosition.lat, satellitePosition.lng], map.getZoom(), {
      animate: true,
      duration: 1
    });

    if (!satelliteMarkerRef.current) {
      satelliteMarkerRef.current = L.marker(
        [satellitePosition.lat, satellitePosition.lng],
        { icon: satelliteIcon }
      ).addTo(map);
    } else {
      satelliteMarkerRef.current.setLatLng([satellitePosition.lat, satellitePosition.lng]);
    }

    // Rotate icon element manually
    const iconElement = satelliteMarkerRef.current.getElement();
    if (iconElement) {
        // The SVG points diagonally, so -45 degrees makes it point "up" (north) for a 0 heading
        iconElement.style.transform = `rotate(${satellitePosition.heading - 45}deg)`;
        iconElement.style.transformOrigin = 'center';
    }
  }, [satellitePosition]);
  
  useEffect(() => {
    const layer = pollutionLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    pollutionData.forEach(p => {
      // Leaflet uses [lat, lng], GeoJSON uses [lng, lat]. We need to swap.
      // FIX: Cast coordinates to a LatLngTuple to satisfy L.polygon's type requirements.
      const leafletCoords = p.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as L.LatLngTuple);
      
      const polygon = L.polygon(leafletCoords, {
        color: '#f87171',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.4
      }).bindPopup(`
        <div class="font-sans">
          <h3 class="font-bold text-lg text-red-400 border-b border-gray-600 mb-2 pb-1">${p.type}</h3>
          <p class="text-sm"><strong class="font-semibold text-gray-300">Confidence:</strong> ${(p.confidence * 100).toFixed(1)}%</p>
        </div>
      `);
      layer.addLayer(polygon);
    });
  }, [pollutionData]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
};

export default MapComponent;
