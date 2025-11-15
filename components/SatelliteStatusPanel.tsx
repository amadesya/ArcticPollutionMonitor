import React, { useRef, useEffect } from 'react';
import { AppState, LogEntry, SatellitePosition, Filters } from '../types';
import FilterPanel from './FilterPanel';

interface SatelliteStatusPanelProps {
  appState: AppState;
  satellitePosition: SatellitePosition;
  logs: LogEntry[];
  onStart: () => void;
  onStop: () => void;
  filters: Filters;
  onFilterChange: (category: keyof Filters, value: string) => void;
  onResetFilters: () => void;
  currentSatelliteImage: string;
}

const StateIndicator: React.FC<{ state: AppState }> = ({ state }) => {
    let color = 'bg-gray-500';
    let text = 'ОСТАНОВЛЕНО';
    switch (state) {
        case AppState.Idle:
            color = 'bg-blue-500';
            text = 'ОЖИДАНИЕ - СЛЕД. СКАНИРОВАНИЕ';
            break;
        case AppState.Scanning:
            color = 'bg-yellow-500 animate-pulse';
            text = 'СКАНИРОВАНИЕ ОБЛАСТИ';
            break;
        case AppState.Analyzing:
            color = 'bg-purple-500 animate-pulse';
            text = 'АНАЛИЗ ДАННЫХ';
            break;
    }
    return (
        <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <span className="text-sm font-semibold tracking-wider">{text}</span>
        </div>
    );
}

const SatelliteStatusPanel: React.FC<SatelliteStatusPanelProps> = ({
  appState,
  satellitePosition,
  logs,
  onStart,
  onStop,
  filters,
  onFilterChange,
  onResetFilters,
  currentSatelliteImage,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const isRunning = appState !== AppState.Stopped;

  return (
    <aside className="w-full md:w-96 bg-gray-800/70 backdrop-blur-md border-l border-gray-700 flex flex-col p-4 space-y-4 md:h-full overflow-y-auto">
      {/* Controls */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-bold text-cyan-400 mb-2">ЦЕНТР УПРАВЛЕНИЯ</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onStart}
            disabled={isRunning}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <i className="ph-bold ph-play"></i>
            <span>СТАРТ</span>
          </button>
          <button
            onClick={onStop}
            disabled={!isRunning}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <i className="ph-bold ph-stop"></i>
            <span>СТОП</span>
          </button>
        </div>
      </div>

      <FilterPanel 
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />
      
      {/* Simulated Image */}
      <div className="flex-shrink-0">
         <h3 className="font-semibold mb-2">ПОСЛЕДНИЙ СПУТНИКОВЫЙ СНИМОК</h3>
         <div className="aspect-square bg-gray-900 rounded-md overflow-hidden border-2 border-gray-700">
           <img
             src={currentSatelliteImage}
             alt="Актуальный спутниковый снимок Арктики"
             className="w-full h-full object-cover"
             key={currentSatelliteImage}
           />
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-md border border-gray-700">
        <h3 className="font-semibold mb-2">СТАТУС СИСТЕМЫ</h3>
        <div className="space-y-1 text-sm">
            <StateIndicator state={appState} />
            <p><strong>Координаты:</strong> {satellitePosition.lat.toFixed(4)}, {satellitePosition.lng.toFixed(4)}</p>
            <p><strong>Курс:</strong> {satellitePosition.heading.toFixed(0)}°</p>
        </div>
      </div>
      
      {/* Logs */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
        <h3 className="font-semibold mb-2 flex-shrink-0">ЖУРНАЛ СОБЫТИЙ</h3>
        <div ref={logContainerRef} className="flex-1 bg-gray-900/50 p-2 rounded-md overflow-y-auto border border-gray-700">
          {logs.map(log => (
            <div key={log.timestamp.toISOString() + log.message} className="text-xs mb-1 flex">
              <span className="text-gray-500 mr-2">{log.timestamp.toLocaleTimeString()}</span>
              <span className={`${
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-green-400' : 
                'text-gray-300'
              }`}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SatelliteStatusPanel;