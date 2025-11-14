
export interface SatellitePosition {
  lat: number;
  lng: number;
  heading: number;
}

export interface GeoJSONGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface PollutionData {
  type: string;
  confidence: number;
  geometry: GeoJSONGeometry;
  timestamp: number;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

export enum AppState {
  Stopped = 'STOPPED',
  Idle = 'IDLE',
  Scanning = 'SCANNING',
  Analyzing = 'ANALYZING'
}
