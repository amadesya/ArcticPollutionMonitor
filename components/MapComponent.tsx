
import React, { useEffect, useRef } from 'react';
import { PollutionData, SatellitePosition } from '../types';

// The Leaflet library is loaded via a <script> tag in index.html,
// so we declare the global `L` object to make TypeScript aware of it.
declare const L: any;

interface MapComponentProps {
  satellitePosition: SatellitePosition;
  pollutionData: PollutionData[];
}

const POLLUTION_COLORS: Record<PollutionData['type'], string> = {
    'Химическое': '#a855f7',
    'Нефтяное': '#ef4444',
    'Физическое': '#f97316',
};

const getPopupContent = (pos: SatellitePosition): string => `
    <div class="font-sans">
        <h3 class="font-bold text-lg border-b border-gray-600 mb-2 pb-1 text-cyan-400">Спутник</h3>
        <p><strong class="font-semibold text-gray-300">Координаты:</strong> ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}</p>
        <p><strong class="font-semibold text-gray-300">Передача данных:</strong> ${pos.dataRate.toFixed(1)} Мбит/с</p>
    </div>`;

const MapComponent: React.FC<MapComponentProps> = ({ satellitePosition, pollutionData }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null);
  const satelliteMarkerRef = useRef<any | null>(null);
  const pollutionLayerRef = useRef<any | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Effect for initializing the map
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    
    if (mapContainer && !mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainer, {
        center: [80, -70],
        zoom: 3,
        minZoom: 2,
        zoomControl: false, 
        attributionControl: false,
      });

      L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: 'Map data &copy;2024 Google',
        maxZoom: 20,
      }).addTo(map);
      
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      pollutionLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainer);
    }
    
    return () => {
        if (resizeObserver && mapContainer) {
          resizeObserver.unobserve(mapContainer);
        }
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    }
  }, []);

  // Effect for creating and animating the satellite marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!satelliteMarkerRef.current) {
      map.setView([satellitePosition.lat, satellitePosition.lng]);
      
      const satelliteIcon = L.divIcon({
          html: `
            <div class="relative flex h-5 w-5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white/50"></span>
            </div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
      });
      
      const marker = L.marker([satellitePosition.lat, satellitePosition.lng], { 
          icon: satelliteIcon,
      }).addTo(map);
      
      marker.bindPopup(getPopupContent(satellitePosition), { className: 'map-popup' });
        
      satelliteMarkerRef.current = marker;
      
    } else {
      satelliteMarkerRef.current.setPopupContent(getPopupContent(satellitePosition));
      
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
  
      const marker = satelliteMarkerRef.current;
      const startLatLng = marker.getLatLng();
      const startPos = { lat: startLatLng.lat, lng: startLatLng.lng };
      const targetPos = satellitePosition;
      const duration = 1000; // Match the simulation interval for smooth animation
      const startTime = performance.now();
  
      const animate = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
  
        const newLat = startPos.lat + (targetPos.lat - startPos.lat) * progress;
        const newLng = startPos.lng + (targetPos.lng - startPos.lng) * progress;
        
        const newCoords: [number, number] = [newLat, newLng];
        marker.setLatLng(newCoords);
  
        if (progress < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameIdRef.current = null;
        }
      };
  
      animationFrameIdRef.current = requestAnimationFrame(animate);
    }
  }, [satellitePosition]);
  
  // Effect for updating the pollution data layer
  useEffect(() => {
    const pollutionLayer = pollutionLayerRef.current;
    if (!pollutionLayer) return;

    pollutionLayer.clearLayers();

    pollutionData.forEach(p => {
        const color = POLLUTION_COLORS[p.type] || '#ef4444';
        
        const leafletCoords = p.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);

        const polygon = L.polygon(leafletCoords, {
            color: color,
            fillColor: color,
            fillOpacity: 0.5,
            weight: 2,
        });

        polygon.bindTooltip(p.type, {
            className: 'map-tooltip',
            sticky: true,
        });

        const popupHtml = `
            <div class="font-sans">
                <h3 class="font-bold text-lg border-b border-gray-600 mb-2 pb-1" style="color: ${color};">${p.type}</h3>
                <p><strong class="font-semibold text-gray-300">Уверенность:</strong> ${(p.confidence * 100).toFixed(1)}%</p>
                <p><strong class="font-semibold text-gray-300">Область:</strong> ${p.impactArea}</p>
                <p><strong class="font-semibold text-gray-300">Опасность:</strong> ${p.hazardLevel}</p>
            </div>`;
        polygon.bindPopup(popupHtml, { className: 'map-popup' });
        
        polygon.addTo(pollutionLayer);
    });
  }, [pollutionData]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
};

export default MapComponent;
