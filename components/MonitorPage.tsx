import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateMockPollutionData } from '../services/mockPollutionService';
import MapComponent from './MapComponent';
import SatelliteStatusPanel from './SatelliteStatusPanel';
import Header from './Header';
import { AppState, LogEntry, PollutionData, SatellitePosition, Filters } from '../types';

interface MonitorPageProps {
  onNavigateHome: () => void;
}

const SATELLITE_IMAGES = [
  'https://images.unsplash.com/photo-1549144511-85b3f20f8b22?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579033423729-1a04a43b1c6d?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1444492417251-9f1265418961?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579586337278-35d997405f2b?q=80&w=800&auto=format&fit=crop'
];

const MonitorPage: React.FC<MonitorPageProps> = ({ onNavigateHome }) => {
  const [satellitePosition, setSatellitePosition] = useState<SatellitePosition>({ lat: 80.0, lng: 0.0, heading: 45 });
  const [pollutionData, setPollutionData] = useState<PollutionData[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.Stopped);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<Filters>({
    type: [],
    hazardLevel: [],
    impactArea: [],
  });
  const [currentSatelliteImage, setCurrentSatelliteImage] = useState<string>(SATELLITE_IMAGES[0]);
  
  const simulationIntervalRef = useRef<number | null>(null);
  const imageIndexRef = useRef(0);

  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ timestamp: new Date(), message, type }, ...prev.slice(0, 99)]);
  }, []);

  const handleFilterChange = useCallback((category: keyof Filters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[category];
      const newValues = currentValues.includes(value as any)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value as any];

      const updatedFilters = { ...prev, [category]: newValues };
      const totalActive = updatedFilters.type.length + updatedFilters.hazardLevel.length + updatedFilters.impactArea.length;
      addLog(`Фильтр обновлен. Активно: ${totalActive}.`);

      return updatedFilters;
    });
  }, [addLog]);

  const resetFilters = useCallback(() => {
    setFilters({ type: [], hazardLevel: [], impactArea: [] });
    addLog('Фильтры сброшены.');
  }, [addLog]);

  const filteredPollutionData = useMemo(() => {
    const hasActiveFilters = filters.type.length > 0 || filters.hazardLevel.length > 0 || filters.impactArea.length > 0;

    if (!hasActiveFilters) {
      return pollutionData;
    }

    return pollutionData.filter(p => {
      const typeMatch = filters.type.length === 0 || filters.type.includes(p.type);
      const hazardMatch = filters.hazardLevel.length === 0 || filters.hazardLevel.includes(p.hazardLevel);
      const impactMatch = filters.impactArea.length === 0 || filters.impactArea.includes(p.impactArea);
      return typeMatch && hazardMatch && impactMatch;
    });
  }, [pollutionData, filters]);

  const runSimulationStep = useCallback(() => {
    addLog('Инициация нового сканирования...');
    setAppState(AppState.Scanning);

    // 1. Update satellite position
    setSatellitePosition(prevPos => {
      // Slower and more logical movement
      const speed = 0.8; // degrees per step, reduced for slower movement
      let newHeading = prevPos.heading;

      // Add a small random wobble to the path to make it feel more natural
      newHeading += (Math.random() - 0.5) * 15;

      // Guide the satellite to stay within a latitude band (e.g., 70 to 88 degrees North)
      // This creates a more orbital, less random path.
      if (prevPos.lat > 88) {
        // If too far north, encourage a turn away from the pole
        if (newHeading < 90 || newHeading > 270) { // Pointing generally north
           newHeading += 45;
        }
      } else if (prevPos.lat < 70) {
        // If too far south, encourage a turn toward the pole
        if (newHeading > 90 && newHeading < 270) { // Pointing generally south
          newHeading += (Math.random() < 0.5 ? -45 : 45); // Turn north-east or north-west
        }
      }

      const headingRad = newHeading * (Math.PI / 180);
      const latChange = Math.cos(headingRad) * speed;
      // Longitude change needs to be scaled by latitude to maintain somewhat constant ground speed
      const lngChange = Math.sin(headingRad) * speed / Math.max(0.1, Math.cos(prevPos.lat * Math.PI / 180));

      let newLat = prevPos.lat + latChange;
      let newLng = prevPos.lng + lngChange;
      
      // Handle crossing the North Pole
      if (newLat > 90) {
        newLat = 180 - newLat;
        newLng += 180;
        newHeading += 180;
      }
      
      // Handle longitude wrapping
      if (newLng > 180) { newLng -= 360; }
      if (newLng < -180) { newLng += 360; }
      
      // Normalize heading to be within 0-360 degrees
      newHeading = (newHeading + 360) % 360;

      const newPos = { lat: newLat, lng: newLng, heading: newHeading };

      addLog(`Спутник переместился на ${newPos.lat.toFixed(2)}, ${newPos.lng.toFixed(2)}`);
      
      // 2. Cycle through images
      imageIndexRef.current = (imageIndexRef.current + 1) % SATELLITE_IMAGES.length;
      setCurrentSatelliteImage(SATELLITE_IMAGES[imageIndexRef.current]);
      addLog('Получен новый спутниковый снимок.');

      // 3. Generate simulated pollution data
      addLog('Генерация симулированных данных о загрязнении...');
      setAppState(AppState.Analyzing);
      
      const analysisResult = generateMockPollutionData(newPos);

      if (analysisResult.length > 0) {
        setPollutionData(prev => [...prev.filter(p => Date.now() - p.timestamp < 600000), ...analysisResult]);
        addLog(`Анализ завершен. Обнаружено ${analysisResult.length} симулированных зон загрязнения.`, 'success');
      } else {
        addLog('Анализ завершен. Загрязнений не обнаружено.');
      }
      
      setAppState(AppState.Idle);
      return newPos;
    });
  }, [addLog]);

  const startSimulation = useCallback(() => {
    addLog('Запуск последовательности мониторинга.', 'success');
    setAppState(AppState.Idle);
    runSimulationStep();
    simulationIntervalRef.current = window.setInterval(runSimulationStep, 10000); 
  }, [addLog, runSimulationStep]);

  const stopSimulation = useCallback(() => {
    addLog('Остановка мониторинга.');
    setAppState(AppState.Stopped);
    if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
    }
  }, [addLog]);

  useEffect(() => {
    return () => { // Cleanup on unmount
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-gray-900 text-gray-200 h-screen w-screen flex flex-col font-sans overflow-hidden">
      <Header onNavigateHome={onNavigateHome} />
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        <div className="h-[50vh] flex-shrink-0 md:flex-1 md:h-auto relative">
          <MapComponent satellitePosition={satellitePosition} pollutionData={filteredPollutionData} />
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