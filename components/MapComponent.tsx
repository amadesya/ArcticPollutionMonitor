import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { PollutionData, SatellitePosition } from '../types';

interface MapComponentProps {
  satellitePosition: SatellitePosition;
  pollutionData: PollutionData[];
}

// A more detailed, modern satellite icon
const satelliteSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
        <path d="M15 12.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z"/>
        <path d="M12 15.5L9.5 21.5m6.5-6L18.5 21.5M12 9.5V4m3 5.5l5.5-2.5m-11 2.5L4.5 7"/>
    </g>
</svg>
`;

const satelliteIcon = L.divIcon({
  html: satelliteSVG,
  className: 'text-cyan-400',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const POLLUTION_COLORS: Record<PollutionData['type'], string> = {
    'Химическое': '#a855f7', // purple-500
    'Нефтяное': '#ef4444',   // red-500
    'Физическое': '#f97316', // orange-500
};


const MapComponent: React.FC<MapComponentProps> = ({ satellitePosition, pollutionData }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const satelliteMarkerRef = useRef<L.Marker | null>(null);
  const pollutionLayerRef = useRef<L.LayerGroup | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const currentPositionRef = useRef<SatellitePosition>(satellitePosition);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [80, 0],
        zoom: 3,
        minZoom: 2, // Allow zooming out further
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
  
    map.setView([satellitePosition.lat, satellitePosition.lng], map.getZoom(), {
      animate: true,
      duration: 1
    });
  
    if (!satelliteMarkerRef.current) {
      const marker = L.marker(
        [satellitePosition.lat, satellitePosition.lng],
        { icon: satelliteIcon }
      ).addTo(map);
      satelliteMarkerRef.current = marker;
      currentPositionRef.current = satellitePosition;
      
      const iconElement = marker.getElement();
      if (iconElement) {
        iconElement.style.transform = `rotate(${satellitePosition.heading}deg)`;
        iconElement.style.transformOrigin = 'center';
      }
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
  
      const marker = satelliteMarkerRef.current;
      const startPos = currentPositionRef.current;
      const targetPos = satellitePosition;
      const duration = 1000; // 1 second animation
      const startTime = performance.now();
  
      // Calculate shortest angle difference
      const angleDiff = targetPos.heading - startPos.heading;
      const shortestAngleDiff = ((angleDiff + 180) % 360) - 180;
  
      const animateMarker = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
  
        const newLat = startPos.lat + (targetPos.lat - startPos.lat) * progress;
        const newLng = startPos.lng + (targetPos.lng - startPos.lng) * progress;
        const newHeading = startPos.heading + shortestAngleDiff * progress;
  
        marker.setLatLng([newLat, newLng]);
        const iconElement = marker.getElement();
        if (iconElement) {
          iconElement.style.transform = `rotate(${newHeading}deg)`;
          iconElement.style.transformOrigin = 'center';
        }
  
        if (progress < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animateMarker);
        } else {
          currentPositionRef.current = targetPos;
          animationFrameIdRef.current = null;
        }
      };
  
      animationFrameIdRef.current = requestAnimationFrame(animateMarker);
    }
  }, [satellitePosition]);
  
  useEffect(() => {
    const layer = pollutionLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    pollutionData.forEach(p => {
      const color = POLLUTION_COLORS[p.type] || '#ef4444';
      const leafletCoords = p.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as L.LatLngTuple);
      
      const polygon = L.polygon(leafletCoords, {
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.5
      }).bindTooltip(p.type, {
        sticky: true,
      }).bindPopup(`
        <div class="font-sans">
          <h3 class="font-bold text-lg border-b border-gray-600 mb-2 pb-1" style="color: ${color};">${p.type}</h3>
          <p><strong class="font-semibold text-gray-300">Уверенность:</strong> ${(p.confidence * 100).toFixed(1)}%</p>
          <p><strong class="font-semibold text-gray-300">Область:</strong> ${p.impactArea}</p>
          <p><strong class="font-semibold text-gray-300">Опасность:</strong> ${p.hazardLevel}</p>
        </div>
      `);
      layer.addLayer(polygon);
    });
  }, [pollutionData]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
};

export default MapComponent;