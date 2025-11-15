import { GoogleGenAI, Type } from "@google/genai";
import { PollutionData } from "../types";

// Lazy initialization for the GoogleGenAI instance to prevent module-level errors on startup.
// The instance is created only on the first API call.
let ai: GoogleGenAI | null = null;
const getAi = () => {
    if (!ai) {
        // Aligned with coding guidelines. The API key is assumed to be available from process.env.API_KEY.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

export const imageToBase64 = async (imageUrl: string): Promise<string> => {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const analyzeImage = async (base64Image: string): Promise<Partial<PollutionData>[]> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Вы — экспертная система анализа спутниковых изображений для мониторинга окружающей среды в Арктике.
    Проанализируйте это изображение на наличие любых потенциальных разливов загрязняющих веществ, таких как нефтяные пятна или химические шлейфы.
    Для каждого обнаружения определите:
    1.  'type': Тип загрязнения (например, 'Нефтяное', 'Химическое').
    2.  'confidence': Ваша уверенность в обнаружении (от 0.0 до 1.0).
    3.  'geometry': GeoJSON полигон, очерчивающий область.
    4.  'impactArea': Область воздействия, определите по изображению, находится ли загрязнение на 'Вода' или 'Почва'.
    5.  'hazardLevel': Уровень опасности ('Низкий', 'Средний', 'Высокий'), оцененный по размеру и виду загрязнения.
    Если разливов нет, верните пустой массив.
  `;

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const gemini = getAi();
      const response = await gemini.models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detections: {
                type: Type.ARRAY,
                description: "Массив обнаруженных зон загрязнения.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: "Тип загрязнения (например, 'Нефтяное', 'Химическое', 'Физическое')."
                    },
                    confidence: {
                      type: Type.NUMBER,
                      description: "Оценка уверенности от 0.0 до 1.0."
                    },
                    geometry: {
                      type: Type.OBJECT,
                      description: "Объект GeoJSON Polygon, представляющий границу разлива. Координаты должны быть [долгота, широта].",
                      properties: {
                          type: { type: Type.STRING, description: "Должно быть 'Polygon'."},
                          coordinates: { 
                              type: Type.ARRAY, 
                              items: { 
                                  type: Type.ARRAY, 
                                  items: { 
                                      type: Type.ARRAY, 
                                      items: { type: Type.NUMBER }
                                  } 
                              } 
                          }
                      },
                      required: ["type", "coordinates"]
                    },
                    impactArea: {
                        type: Type.STRING,
                        description: "Область воздействия ('Вода' или 'Почва')."
                    },
                    hazardLevel: {
                        type: Type.STRING,
                        description: "Уровень опасности ('Низкий', 'Средний' или 'Высокий')."
                    }
                  },
                  required: ["type", "confidence", "geometry", "impactArea", "hazardLevel"]
                }
              }
            },
            required: ["detections"]
          }
        }
      });

      const jsonText = response.text.trim();
      const result = JSON.parse(jsonText);
      
      if (result.detections && Array.isArray(result.detections)) {
          return result.detections;
      }
      return [];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for rate limit error (429)
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        if (attempt === MAX_RETRIES - 1) {
          console.error(`Ошибка Gemini API: Не удалось выполнить запрос после ${MAX_RETRIES} попыток из-за превышения лимита.`, error);
          throw new Error("Достигнут лимит запросов к API. Пожалуйста, подождите несколько минут перед повторным запуском мониторинга.");
        }
        // Increased exponential backoff with jitter: ~60s, ~120s, ~240s
        const delay = Math.pow(2, attempt) * 60000 + Math.random() * 5000;
        console.warn(`Превышен лимит запросов Gemini API. Повторная попытка через ${Math.round(delay / 1000)} сек... (Попытка ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Not a retriable error
        console.error("Ошибка при анализе изображения с помощью Gemini:", error);
        throw new Error("Не удалось получить анализ от Gemini API.");
      }
    }
  }
  
  // Fallback error, should not be reached if the loop logic is correct
  throw new Error("Не удалось завершить анализ изображения после нескольких попыток.");
};