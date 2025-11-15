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
  type: 'Химическое' | 'Нефтяное' | 'Физическое';
  confidence: number;
  geometry: GeoJSONGeometry;
  timestamp: number;
  impactArea: 'Вода' | 'Почва';
  hazardLevel: 'Низкий' | 'Средний' | 'Высокий';
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

export interface Filters {
  type: ('Химическое' | 'Нефтяное' | 'Физическое')[];
  hazardLevel: ('Низкий' | 'Средний' | 'Высокий')[];
  impactArea: ('Вода' | 'Почва')[];
}
