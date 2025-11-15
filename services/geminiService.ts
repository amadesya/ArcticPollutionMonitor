
import { GoogleGenAI, Type } from "@google/genai";
import { PollutionData } from "../types";

// FIX: Aligned with coding guidelines. The API key is assumed to be available from process.env.API_KEY, so conditional initialization is removed.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const analyzeImage = async (base64Image: string): Promise<PollutionData[]> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Вы — экспертная система анализа спутниковых изображений для мониторинга окружающей среды в Арктике.
    Проанализируйте это изображение на наличие любых потенциальных разливов загрязняющих веществ, таких как нефтяные пятна или химические шлейфы.
    Если вы обнаружите какие-либо, предоставьте их детали. Если разливов нет, верните пустой массив.
  `;

  try {
    const response = await ai.models.generateContent({
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
                    description: "Тип загрязнения (например, 'Нефтяное пятно', 'Химический шлейф')."
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
                  }
                },
                required: ["type", "confidence", "geometry"]
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
      return result.detections.map((p: any) => ({ ...p, timestamp: Date.now() }));
    }
    return [];

  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw new Error("Не удалось получить анализ от Gemini API.");
  }
};