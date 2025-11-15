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

// === Arctic Boundaries ===
const ARCTIC_EAST = 32.07639;  // 32° 4' 35" E
const ARCTIC_WEST = -168.825;  // 168° 49' 30" W
const ARCTIC_SOUTH = 66.55;    // 66° 33' N
const ARCTIC_NORTH = 90.0;

// === Initial Pollution Data (unchanged) ===
const initialPollutionData: PollutionData[] = [ /* ... your existing data ... */ ];

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
    addLog('Анализ спутникового снимка...');
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
        addLog(`Обнаружено ${result.length} зон загрязнения.`, 'success');
      } else {
        addLog('Загрязнений не обнаружено.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      addLog(`Ошибка: ${msg}`, 'error');
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
