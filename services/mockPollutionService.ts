
import { PollutionData, SatellitePosition } from '../types';

const POLLUTION_TYPES: Array<'Химическое' | 'Нефтяное' | 'Физическое'> = ['Химическое', 'Нефтяное', 'Физическое'];
const HAZARD_LEVELS: Array<'Низкий' | 'Средний' | 'Высокий'> = ['Низкий', 'Средний', 'Высокий'];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- Логика определения Суша/Вода ---

// Упрощенные полигоны для арктических массивов суши. Формат: [lng, lat]
const ARCTIC_LANDMASSES = [
    // Гренландия
    [
        [-55, 83.5], [-20, 83], [-15, 81], [-25, 75], [-35, 68], [-50, 60], [-60, 65], [-70, 70], [-60, 78], [-55, 83.5]
    ],
    // Шпицберген
    [
        [10, 80.8], [30, 80.5], [32, 79], [25, 77], [12, 77.5], [10, 80.8]
    ],
    // Канадский Арктический архипелаг + Северная Канада (очень упрощенно)
    [
        [-125, 78], [-110, 82], [-80, 83], [-65, 81], [-60, 75], [-70, 68], [-85, 65], [-100, 68], [-120, 70], [-130, 72], [-125, 78]
    ],
    // Северная Сибирь (Россия)
    [
        [60, 73], [80, 77], [100, 79], [120, 78], [140, 76], [170, 72], [180, 70], [170, 68], [140, 70], [120, 72], [100, 73], [80, 72], [60, 73]
    ],
    // Аляска
    [
        [-168, 71.5], [-155, 71], [-145, 70], [-141, 68], [-150, 67], [-165, 68], [-168, 71.5]
    ]
];

/**
 * Проверяет, находится ли точка внутри полигона, используя алгоритм трассировки лучей.
 * @param point - Точка для проверки в формате [lng, lat].
 * @param polygon - Массив точек, представляющих вершины полигона.
 * @returns True, если точка внутри полигона, иначе false.
 */
const isPointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
    const [x, y] = point; // x - долгота, y - широта
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            isInside = !isInside;
        }
    }
    return isInside;
};

/**
 * Определяет, находится ли данная координата над сушей на основе предопределенных полигонов.
 * @param lat - Широта.
 * @param lng - Долгота.
 * @returns True, если координата на суше, иначе false.
 */
const isLand = (lat: number, lng: number): boolean => {
    const point: [number, number] = [lng, lat];
    for (const landmass of ARCTIC_LANDMASSES) {
        if (isPointInPolygon(point, landmass)) {
            return true;
        }
    }
    return false;
};


// Генерирует случайный полигон вокруг центральной точки
const generatePolygon = (lat: number, lng: number): number[][][] => {
    const points = 5 + Math.floor(Math.random() * 5);
    const radius = 0.2 + Math.random() * 0.8;
    const coords: number[][] = [];
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const pointLat = lat + Math.cos(angle) * radius * (0.5 + Math.random() * 0.5);
        const pointLng = lng + Math.sin(angle) * radius * (0.5 + Math.random() * 0.5);
        coords.push([pointLng, pointLat]);
    }
    coords.push(coords[0]); // Замыкаем полигон
    return [coords];
};

export const generateMockPollutionData = (satellitePosition: SatellitePosition): PollutionData[] => {
    // Обнаруживаем загрязнение только в ~60% случаев
    if (Math.random() < 0.4) {
        return [];
    }
    
    const detections: PollutionData[] = [];
    const numDetections = 1 + Math.floor(Math.random() * 2); // 1 или 2 обнаружения

    for (let i = 0; i < numDetections; i++) {
        // Смещаем центр обнаружения от центра спутника
        const centerLat = satellitePosition.lat + (Math.random() - 0.5) * 1.5;
        const centerLng = satellitePosition.lng + (Math.random() - 0.5) * 1.5;
        
        // Определяем область воздействия в зависимости от координат
        const impactArea: 'Вода' | 'Почва' = isLand(centerLat, centerLng) ? 'Почва' : 'Вода';

        detections.push({
            type: getRandomElement(POLLUTION_TYPES),
            confidence: 0.75 + Math.random() * 0.24, // 75% - 99%
            geometry: {
                type: 'Polygon',
                coordinates: generatePolygon(centerLat, centerLng),
            },
            timestamp: Date.now(),
            impactArea: impactArea, // Используем определенное значение
            hazardLevel: getRandomElement(HAZARD_LEVELS),
        });
    }

    return detections;
};
