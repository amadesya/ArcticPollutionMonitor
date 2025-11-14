
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeImage } from './services/geminiService';
import MapComponent from './components/MapComponent';
import SatelliteStatusPanel from './components/SatelliteStatusPanel';
import Header from './components/Header';
import { AppState, LogEntry, PollutionData, SatellitePosition } from './types';

const App: React.FC = () => {
  const [satellitePosition, setSatellitePosition] = useState<SatellitePosition>({ lat: 80.0, lng: 0.0, heading: 0 });
  const [pollutionData, setPollutionData] = useState<PollutionData[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.Stopped);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const simulationIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ timestamp: new Date(), message, type }, ...prev.slice(0, 99)]);
  }, []);

  const captureFrame = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) {
        return reject("Video element not found");
      }

      const drawFrame = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject("Could not get canvas context");
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        resolve(dataUrl.split(',')[1]);
      };

      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        drawFrame();
      } else {
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay);
          video.removeEventListener('error', onError);
          drawFrame();
        };
        const onError = (e: Event) => {
          video.removeEventListener('canplay', onCanPlay);
          video.removeEventListener('error', onError);
          reject(`Video element failed to load: ${e.type}`);
        };
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('error', onError);
      }
    });
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

    try {
        // 2. Capture frame from video feed
        addLog('Capturing frame from live feed...');
        const base64Image = await captureFrame();
        
        // 3. Analyze image with Gemini
        addLog('Analyzing image for pollution signatures...');
        setAppState(AppState.Analyzing);
        
        const analysisResult = await analyzeImage(base64Image);

        if (analysisResult && analysisResult.length > 0) {
            setPollutionData(prev => [...prev.filter(p => Date.now() - p.timestamp < 60000), ...analysisResult]);
            addLog(`Analysis complete. Detected ${analysisResult.length} potential pollution zones.`, 'success');
        } else {
            addLog('Analysis complete. No pollution detected.');
        }
    } catch (error) {
        console.error("Analysis failed:", error);
        addLog(`AI analysis failed. ${error instanceof Error ? error.message : 'See console for details.'}`, 'error');
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
        // FIX: Use functional update to avoid stale state and race conditions.
        setAppState(currentAppState => currentAppState === AppState.Stopped ? AppState.Stopped : AppState.Idle);
    }
  }, [addLog, captureFrame]);

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
          logs={logs}
          onStart={startSimulation}
          onStop={stopSimulation}
          videoRef={videoRef}
        />
      </div>
    </div>
  );
};

export default App;
