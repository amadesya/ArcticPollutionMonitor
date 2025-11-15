import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { analyzeImage, imageToBase64 } from '../services/geminiService';
import MapComponent from './MapComponent';
import SatelliteStatusPanel from './SatelliteStatusPanel';
import Header from './Header';
import { AppState, LogEntry, PollutionData, SatellitePosition, Filters } from '../types';
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

// === New Trajectory: Diagonal over Greenland (NW → SE, 135°) ===
const GREENLAND_CENTER_LAT = 76.5;     // Mid-latitude of Greenland
const GREENLAND_CENTER_LNG = -42.0;    // Approximate center longitude

// Start: Northwest corner of Greenland (high latitude, west side)
const PATROL_START_POINT: SatellitePosition = {
  lat: 83.0,
  lng: -70.0,
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
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-71,82,-69,84&bboxSR=4326&size=512,512&format=jpg&f=image`
  );

  const simulationIntervalRef = useRef<number | null>(null);
  const scanCounterRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);


  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ timestamp: new Date(), message, type }, ...prev.slice(0, 99)]);
  }, []);

  const startSimulation = useCallback(() => {
    addLog('Запуск симуляции...', 'success');
    scanCounterRef.current = 0;
    patrolDirectionRef.current = 'forward'; // Reset direction to forward
    setSatellitePosition(PATROL_START_POINT); // Reset satellite to start point
    setAppState(AppState.Idle);
  }, [addLog]);

  const stopSimulation = useCallback(() => {
    addLog('Симуляция остановлена.');
    setAppState(AppState.Stopped);
    isAnalyzingRef.current = false;
  }, [addLog]);

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

      const total = Object.values(updated).flat().length;
      addLog(`Фильтр обновлён. Активно: ${total}.`);
      return updated;
    });
  }, [addLog]);

  const resetFilters = useCallback(() => {
    setFilters({ type: [], hazardLevel: [], impactArea: [], confidence: [] });
    addLog('Фильтры сброшены.');
  }, [addLog]);

  const getConfidenceLevel = (value: number): 'Низкая' | 'Средняя' | 'Высокая' => {
    if (value < 0.75) return 'Низкая';
    if (value <= 0.9) return 'Средняя';
    return 'Высокая';
  };

  const filteredPollutionData = useMemo(() => {
    const active = Object.values(filters).some(arr => arr.length > 0);
    if (!active) return pollutionData;
    return pollutionData.filter(p => {
      const type = filters.type.length === 0 || filters.type.includes(p.type);
      const hazard = filters.hazardLevel.length === 0 || filters.hazardLevel.includes(p.hazardLevel);
      const area = filters.impactArea.length === 0 || filters.impactArea.includes(p.impactArea);
      const conf = filters.confidence.length === 0 || filters.confidence.includes(getConfidenceLevel(p.confidence));
      return type && hazard && area && conf;
    });
  }, [pollutionData, filters]);

  const analyzePosition = useCallback(async (pos: SatellitePosition, imageUrl: string) => {
    addLog('Запрос к нейросети для анализа снимка...');
    setAppState(AppState.Analyzing);
    try {
      const base64 = await imageToBase64(imageUrl);
      const result = await analyzeImage(base64);
      if (result.length > 0) {
        const newData: PollutionData[] = result.map(p => ({
          type: p.type || 'Нефтяное',
          confidence: p.confidence || 0.8,
          geometry: p.geometry || { type: 'Polygon', coordinates: [] },
          timestamp: Date.now(),
          impactArea: p.impactArea || 'Вода',
          hazardLevel: p.hazardLevel || 'Средний',
        }));
        setPollutionData(prev => [...prev, ...newData]);
        const zones = getZonePlural(result.length);
        addLog(`Нейросеть обнаружила ${result.length} ${zones} загрязнения.`, 'success');
      } else {
        addLog('Нейросеть подтвердила: загрязнений на снимке нет.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      addLog(`Ошибка анализа нейросетью: ${msg}`, 'error');
    } finally {
      setAppState(AppState.Idle);
    }
  }, [addLog]);

  // === UPDATED: Simulation Step with back-and-forth patrol ===
const patrolDirectionRef = useRef<'forward' | 'backward'>('forward'); // Убедись, что это объявлено выше

const runSimulationStep = useCallback(() => {
  scanCounterRef.current += 1;
  const shouldAnalyze = scanCounterRef.current % 90 === 0;

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

      addLog(
        newDir === 'forward'
          ? 'Достигнута юго-восточная точка. Возвращение на северо-запад.'
          : 'Достигнута северо-западная точка. Возвращение на юго-восток.',
        'success'
      );
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
    setCurrentSatelliteImage(url);

    addLog(`Спутник: ${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E | Курс: ${heading}°`);

    // === Анализ ===
    if (shouldAnalyze && !isAnalyzingRef.current) {
      setAppState(AppState.Scanning);
      isAnalyzingRef.current = true;
      analyzePosition(pos, url).finally(() => { isAnalyzingRef.current = false; });
    } else if (!isAnalyzingRef.current) {
      setAppState(AppState.Idle);
    }

    return pos;
  });
}, [addLog, analyzePosition]);

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