
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeImage, imageToBase64 } from './services/geminiService';
import { PollutionData, SatellitePosition, LogEntry, AppState } from './types';
import MapComponent from './components/MapComponent';
import SatelliteStatusPanel from './components/SatelliteStatusPanel';
import Header from './components/Header';

const App: React.FC = () => {
  const [satellitePosition, setSatellitePosition] = useState<SatellitePosition>({ lat: 80.0, lng: 0.0, heading: 0 });
  const [pollutionData, setPollutionData] = useState<PollutionData[]>([]);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [appState, setAppState] = useState<AppState>(AppState.Stopped);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const simulationIntervalRef = useRef<number | null>(null);

  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ timestamp: new Date(), message, type }, ...prev.slice(0, 99)]);
  }, []);

  const runSimulationStep = useCallback(async () => {
    addLog('Initiating new scan...');
    setAppState(AppState.Scanning);

    // 1. Update satellite position
    setSatellitePosition(prev => {
        const newLng = (prev.lng + 5) % 180;
        const newLat = prev.lat + (Math.random() - 0.5) * 2;
        const newHeading = (prev.heading + 15) % 360;
        const clampedLat = Math.max(75, Math.min(85, newLat));
        addLog(`Satellite moved to ${clampedLat.toFixed(2)}, ${newLng.toFixed(2)}`);
        return { lat: clampedLat, lng: newLng, heading: newHeading };
    });

    // 2. Fetch "satellite" image
    const imageUrl = `https://picsum.photos/seed/${Date.now()}/512/512`;
    setCurrentImage(imageUrl);
    addLog('Acquired new satellite image.');

    try {
        // 3. Analyze image with Gemini
        addLog('Analyzing image for pollution signatures...');
        setAppState(AppState.Analyzing);
        
        const base64Image = await imageToBase64(imageUrl);
        const analysisResult = await analyzeImage(base64Image);

        if (analysisResult && analysisResult.length > 0) {
            setPollutionData(prev => [...prev.filter(p => Date.now() - p.timestamp < 60000), ...analysisResult]);
            addLog(`Analysis complete. Detected ${analysisResult.length} potential pollution zones.`, 'success');
        } else {
            addLog('Analysis complete. No pollution detected.');
        }
    } catch (error) {
        console.error("Analysis failed:", error);
        addLog("AI analysis failed. Using mock data for demo.", 'error');
        // Fallback to mock data on error
        const mockPollution: PollutionData[] = [
          {
            type: 'Mock Oil Slick',
            confidence: 0.85,
            geometry: {
              type: 'Polygon',
              coordinates: [[[-1, 80.1], [-0.9, 80.2], [-0.8, 80.1], [-0.9, 80.0], [-1, 80.1]]]
            },
            timestamp: Date.now()
          }
        ];
        setPollutionData(prev => [...prev.filter(p => Date.now() - p.timestamp < 60000), ...mockPollution]);
    } finally {
        setAppState(appState === AppState.Stopped ? AppState.Stopped : AppState.Idle);
    }
  }, [addLog, appState]);

  const startSimulation = useCallback(() => {
    addLog('Starting real-time monitoring sequence.', 'success');
    setAppState(AppState.Idle);
    runSimulationStep();
    simulationIntervalRef.current = window.setInterval(runSimulationStep, 10000); // 10 seconds per frame
  }, [addLog, runSimulationStep]);

  const stopSimulation = useCallback(() => {
    addLog('Stopping real-time monitoring.');
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
      <Header />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 relative">
          <MapComponent satellitePosition={satellitePosition} pollutionData={pollutionData} />
        </div>
        <SatelliteStatusPanel
          appState={appState}
          satellitePosition={satellitePosition}
          currentImage={currentImage}
          logs={logs}
          onStart={startSimulation}
          onStop={stopSimulation}
        />
      </div>
    </div>
  );
};

export default App;
