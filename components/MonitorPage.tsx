
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { analyzeImage, imageToBase64 } from '../services/geminiService';
import MapComponent from './MapComponent';
import SatelliteStatusPanel from './SatelliteStatusPanel';
import Header from './Header';
import { AppState, LogEntry, PollutionData, SatellitePosition, Filters, GeoJSONGeometry } from '../types';
import MapLegend from './MapLegend';

interface MonitorPageProps {
  onNavigateHome: () => void;
}

// Helper for Russian pluralization of "зона" (zone)
const getZonePlural = (number: number): string => {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return 'зон';
    }
    n %= 10;
    if (n === 1) {
        return 'зону';
    }
    if (n >= 2 && n <= 4) {
        return 'зоны';
    }
    return 'зон';
};

// === Arctic Boundaries ===
const ARCTIC_EAST = 32.07639;  // 32° 4' 35" E
const ARCTIC_WEST = -168.825;  // 168° 49' 30" W
const ARCTIC_SOUTH = 66.55;    // 66° 33' N
const ARCTIC_NORTH = 90.0;

// Helper to create a small square polygon around a point
const createSquarePolygon = (lat: number, lng: number, size = 0.1) => {
    const half = size / 2;
    return {
        type: 'Polygon' as 'Polygon',
        coordinates: [[
            [lng - half, lat - half],
            [lng + half, lat - half],
            [lng + half, lat + half],
            [lng - half, lat + half],
            [lng - half, lat - half]
        ]]
    };
};

// === Initial Pollution Data (unchanged) ===
const initialPollutionData: PollutionData[] = [
  // Barents Sea (Oil)
  { type: 'Нефтяное', confidence: 0.95, geometry: createSquarePolygon(70.5, 50.1), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Высокий' },
  { type: 'Нефтяное', confidence: 0.88, geometry: createSquarePolygon(71.2, 55.6), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },
  { type: 'Физическое', confidence: 0.82, geometry: createSquarePolygon(69.8, 45.3), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Низкий' },
  { type: 'Химическое', confidence: 0.91, geometry: createSquarePolygon(72.0, 51.5), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },

  // Kara Sea (Chemical/Physical)
  { type: 'Химическое', confidence: 0.98, geometry: createSquarePolygon(75.5, 80.2), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Высокий' },
  { type: 'Физическое', confidence: 0.78, geometry: createSquarePolygon(77.1, 85.9), timestamp: Date.now(), impactArea: 'Почва', hazardLevel: 'Средний' }, // Near land
  { type: 'Нефтяное', confidence: 0.85, geometry: createSquarePolygon(76.3, 75.1), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },

  // Laptev Sea (Physical/Chemical from rivers)
  { type: 'Физическое', confidence: 0.92, geometry: createSquarePolygon(74.0, 128.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },
  { type: 'Химическое', confidence: 0.84, geometry: createSquarePolygon(73.5, 130.5), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Низкий' },
  
  // East Siberian Sea
  { type: 'Нефтяное', confidence: 0.80, geometry: createSquarePolygon(72.5, 165.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Низкий' },
  { type: 'Физическое', confidence: 0.88, geometry: createSquarePolygon(71.8, 175.2), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },

  // Beaufort Sea (Canada/Alaska)
  { type: 'Нефтяное', confidence: 0.96, geometry: createSquarePolygon(70.5, -135.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Высокий' },
  { type: 'Нефтяное', confidence: 0.89, geometry: createSquarePolygon(71.0, -145.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },
  { type: 'Физическое', confidence: 0.79, geometry: createSquarePolygon(69.9, -140.5), timestamp: Date.now(), impactArea: 'Почва', hazardLevel: 'Низкий' },

  // Canadian Archipelago
  { type: 'Физическое', confidence: 0.85, geometry: createSquarePolygon(75.0, -95.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },
  { type: 'Химическое', confidence: 0.90, geometry: createSquarePolygon(78.0, -85.0), timestamp: Date.now(), impactArea: 'Почва', hazardLevel: 'Средний' },

  // Baffin Bay / Greenland Sea
  { type: 'Нефтяное', confidence: 0.82, geometry: createSquarePolygon(74.0, -60.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Низкий' },
  { type: 'Физическое', confidence: 0.91, geometry: createSquarePolygon(77.0, -15.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },
  { type: 'Химическое', confidence: 0.87, geometry: createSquarePolygon(79.0, -5.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },

  // Svalbard Area
  { type: 'Нефтяное', confidence: 0.93, geometry: createSquarePolygon(78.5, 25.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Высокий' },
  { type: 'Физическое', confidence: 0.86, geometry: createSquarePolygon(79.5, 15.0), timestamp: Date.now(), impactArea: 'Почва', hazardLevel: 'Средний' },
  { type: 'Химическое', confidence: 0.81, geometry: createSquarePolygon(77.0, 30.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Низкий' },
  
  // Central Arctic
  { type: 'Физическое', confidence: 0.75, geometry: createSquarePolygon(85.0, 90.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Низкий' },
  { type: 'Нефтяное', confidence: 0.83, geometry: createSquarePolygon(88.0, -10.0), timestamp: Date.now(), impactArea: 'Вода', hazardLevel: 'Средний' },
];

// Start: 70°43'01.7"N 21°36'10.6"W
const PATROL_START_POINT: SatellitePosition = {
  lat: 70.7171,
  lng: -21.6029,
  heading: 135,
  dataRate: 500.0,
  stepIndex: 0
};

// End: Southeast corner (lower latitude, east side)
const PATROL_END_POINT = {
  lat: 70.0,
  lng: -20.0
};

const PATROL_HEADING = 135; // Southeast
const SIMULATION_INTERVAL_MS = 1000;

// === Component ===
const MonitorPage: React.FC<MonitorPageProps> = ({ onNavigateHome }) => {
  const [satellitePosition, setSatellitePosition] = useState<SatellitePosition>(PATROL_START_POINT);
  const [pollutionData, setPollutionData] = useState<PollutionData[]>(initialPollutionData);
  const [appState, setAppState] = useState<AppState>(AppState.Stopped);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<Filters>({ type: [], hazardLevel: [], impactArea: [], confidence: [] });
  const [currentSatelliteImage, setCurrentSatelliteImage] = useState<string>(
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-22.6,70.2,-20.6,71.2&bboxSR=4326&size=512,512&format=jpg&f=image`
  );

  const simulationIntervalRef = useRef<number | null>(null);
  const scanCounterRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);
  const patrolDirectionRef = useRef<'forward' | 'backward'>('forward');


  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ timestamp: new Date(), message, type }, ...prev.slice(0, 99)]);
  }, []);

  const startSimulation = useCallback(() => {
    scanCounterRef.current = 0;
    patrolDirectionRef.current = 'forward'; // Reset direction to forward
    setSatellitePosition(PATROL_START_POINT); // Reset satellite to start point
    setAppState(AppState.Idle);
  }, []);

  const stopSimulation = useCallback(() => {
    setAppState(AppState.Stopped);
    isAnalyzingRef.current = false;
  }, []);

  const handleFilterChange = useCallback((category: keyof Filters, value: string) => {
    setFilters(prev => {
      const updated = { ...prev };
      const toggle = <T extends string>(arr: T[], val: T) =>
        arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

      switch (category) {
        case 'type': updated.type = toggle(updated.type, value as any); break;
        case 'hazardLevel': updated.hazardLevel = toggle(updated.hazardLevel, value as any); break;
        case 'impactArea': updated.impactArea = toggle(updated.impactArea, value as any); break;
        case 'confidence': updated.confidence = toggle(updated.confidence, value as any); break;
      }
      return updated;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ type: [], hazardLevel: [], impactArea: [], confidence: [] });
  }, []);

  const getConfidenceLevel = (value: number): 'Низкая' | 'Средняя' | 'Высокая' => {
    if (value < 0.75) return 'Низкая';
    if (value <= 0.9) return 'Средняя';
    return 'Высокая';
  };

  const filteredPollutionData = useMemo(() => {
    // FIX: Added an Array.isArray check to prevent a runtime error if a filter value is not an array.
    const active = Object.values(filters).some(arr => Array.isArray(arr) && arr.length > 0);
    if (!active) return pollutionData;
    return pollutionData.filter(p => {
      const type = filters.type.length === 0 || filters.type.includes(p.type);
      const hazard = filters.hazardLevel.length === 0 || filters.hazardLevel.includes(p.hazardLevel);
      const area = filters.impactArea.length === 0 || filters.impactArea.includes(p.impactArea);
      const conf = filters.confidence.length === 0 || filters.confidence.includes(getConfidenceLevel(p.confidence));
      return type && hazard && area && conf;
    });
  }, [pollutionData, filters]);

  const analyzePosition = useCallback(async (pos: SatellitePosition, imageUrl: string, scanCount: number) => {
    // At 5 seconds, trigger a simulated major detection
    if (scanCount === 5) {
        setAppState(AppState.Analyzing);
        addLog('ИМИТАЦИЯ: AI обнаруживает аномалию на снимке...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate analysis time

        const simulatedDetection: PollutionData = {
            type: 'Нефтяное',
            confidence: 0.98,
            geometry: createSquarePolygon(pos.lat + 0.1, pos.lng - 0.1, 0.25), // Place it near the satellite
            timestamp: Date.now(),
            impactArea: 'Вода',
            hazardLevel: 'Высокий'
        };

        setPollutionData(prev => [...prev, simulatedDetection]);
        addLog(`ИМИТАЦИЯ: Обнаружен крупный разлив нефти! Координаты добавлены на карту.`, 'success');
        
        setAppState(AppState.Idle);
        return; // Important: skip real API call for this simulated event
    }

    setAppState(AppState.Analyzing);
    addLog('AI обрабатывает последний спутниковый снимок...');
    try {
      const base64 = await imageToBase64(imageUrl);
      const detections: Partial<PollutionData>[] = await analyzeImage(base64);

      if (!Array.isArray(detections)) {
        addLog('Ошибка: API вернуло неожиданный формат данных.', 'error');
        return;
      }

      if (detections.length > 0) {
        // Filter detections to ensure they have a valid geometry that can be rendered, preventing crashes.
        const validDetections = detections.filter(p =>
          p && p.geometry && Array.isArray(p.geometry.coordinates) && p.geometry.coordinates.length > 0
        );

        if (validDetections.length > 0) {
          const newData: PollutionData[] = validDetections.map(p => ({
            type: p.type || 'Нефтяное',
            confidence: p.confidence || 0.8,
            geometry: p.geometry!, // The filter above makes this safe.
            timestamp: Date.now(),
            impactArea: p.impactArea || 'Вода',
            hazardLevel: p.hazardLevel || 'Средний',
          }));

          setPollutionData(prev => [...prev, ...newData]);
          const zones = getZonePlural(newData.length);
          addLog(`Нейросеть обнаружила ${newData.length} ${zones} загрязнения.`, 'success');
        } else {
          // This branch is hit if the detections array was not empty, but all items in it had invalid geometry.
          addLog('AI-анализ вернул данные в некорректном формате.');
        }
      } else {
        // This branch is hit if the detections array was empty from the start.
        addLog('Нейросеть подтвердила: загрязнений на снимке нет.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      addLog(`Ошибка анализа нейросетью: ${msg}`, 'error');
    } finally {
      setAppState(AppState.Idle);
    }
  }, [addLog]);

  const runSimulationStep = useCallback(() => {
    scanCounterRef.current += 1;
    const shouldAnalyze = scanCounterRef.current % 90 === 0;
    const shouldUpdateImage = (scanCounterRef.current - 1) % 60 === 0;

    setSatellitePosition(prev => {
      const SPEED_KPH = 700; // Реалистичная скорость (например, разведчик)
      const INTERVAL_H = SIMULATION_INTERVAL_MS / 3600000; // 1000 мс → 1/3600 часа

      // === Текущие точки: зависят от направления ===
      const isForward = patrolDirectionRef.current === 'forward';
      const startPoint = isForward ? PATROL_START_POINT : PATROL_END_POINT;
      const endPoint   = isForward ? PATROL_END_POINT : PATROL_START_POINT;

      // === Дельты (от старта к концу) ===
      const dLat = endPoint.lat - startPoint.lat;
      let dLng = endPoint.lng - startPoint.lng;
      dLng = ((dLng + 180) % 360 + 360) % 360 - 180; // Кратчайший путь

      // === Расстояние (км) ===
      const avgLat = (startPoint.lat + endPoint.lat) / 2;
      const cosLat = Math.cos(avgLat * Math.PI / 180);
      const distKm = Math.hypot(dLat * 111.32, dLng * 111.32 * cosLat);

      // === Шагов на участок ===
      const totalSteps = Math.ceil(distKm / (SPEED_KPH * INTERVAL_H));

      // === Шаг ===
      let step = (prev.stepIndex ?? 0) + 1;

      // === Переключение направления ===
      if (step >= totalSteps) {
        const newDir = isForward ? 'backward' : 'forward';
        patrolDirectionRef.current = newDir;
        step = 0;
        // Intentionally not logging direction change to keep log focused on analysis.
      }

      // === Прогресс (0..1) ===
      const progress = step / totalSteps;

      // === Координаты: линейная интерполяция от start → end ===
      const lat = startPoint.lat + dLat * progress;
      let lng = startPoint.lng + dLng * progress;
      lng = ((lng + 180) % 360 + 360) % 360 - 180; // Нормализация

      // === Курс: 135° вперёд, 315° назад ===
      const heading = isForward ? PATROL_HEADING : (PATROL_HEADING + 180) % 360;

      const dataRate = 500 + (Math.random() - 0.5) * 50;
      const pos: SatellitePosition = { lat, lng, heading, dataRate, stepIndex: step };

      // === BBOX (35 км) ===
      const SCAN_KM = 35;
      const KM_PER_DEG_LAT = 111.32;
      const latSpan = SCAN_KM / KM_PER_DEG_LAT;
      const lngSpan = SCAN_KM / (KM_PER_DEG_LAT * Math.cos(lat * Math.PI / 180));

      const minLng = Math.max(ARCTIC_WEST, lng - lngSpan / 2);
      const maxLng = Math.min(ARCTIC_EAST, lng + lngSpan / 2);
      const minLat = Math.max(ARCTIC_SOUTH, lat - latSpan / 2);
      const maxLat = Math.min(ARCTIC_NORTH, lat + latSpan / 2);

      const bbox = [minLng, minLat, maxLng, maxLat].join(',');
      const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=512,512&format=jpg&f=image`;
      
      if (shouldUpdateImage) {
        setCurrentSatelliteImage(url);
      }

      // Intentionally not logging satellite position to keep log focused on analysis.

      // === Анализ ===
      if (shouldAnalyze && !isAnalyzingRef.current) {
        setAppState(AppState.Scanning);
        isAnalyzingRef.current = true;
        analyzePosition(pos, url, scanCounterRef.current).finally(() => { isAnalyzingRef.current = false; });
      } else if (!isAnalyzingRef.current) {
        setAppState(AppState.Idle);
      }

      return pos;
    });
  }, [analyzePosition]);

  // === Simulation Loop ===
  useEffect(() => {
    if (appState === AppState.Stopped) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      return;
    }

    // This is the start/running case
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    
    runSimulationStep();
    simulationIntervalRef.current = window.setInterval(runSimulationStep, SIMULATION_INTERVAL_MS);
    
    // Cleanup on unmount or if appState changes
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    };
  }, [appState, runSimulationStep]);

  return (
    <div className="bg-gray-900 text-gray-200 h-screen w-screen flex flex-col font-sans overflow-hidden">
      <Header onNavigateHome={onNavigateHome} />
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        <div className="h-[50vh] flex-shrink-0 md:flex-1 md:h-auto relative">
          <MapComponent satellitePosition={satellitePosition} pollutionData={filteredPollutionData} />
          <div className="absolute bottom-2 md:bottom-10 left-2 z-[1000]">
            <MapLegend />
          </div>
        </div>
        <SatelliteStatusPanel
          appState={appState}
          satellitePosition={satellitePosition}
          logs={logs}
          onStart={startSimulation}
          onStop={stopSimulation}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={resetFilters}
          currentSatelliteImage={currentSatelliteImage}
        />
      </div>
    </div>
  );
};


export default MonitorPage;
