
import { GoogleGenAI, Type } from "@google/genai";
import { PollutionData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using mock data.");
}
// This check ensures we don't crash if the API key is not available.
// In a real environment, this should be handled more gracefully.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

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
  if (!ai) {
    throw new Error("Gemini AI client not initialized. Check API Key.");
  }

  const model = "gemini-2.5-flash";
  const prompt = `
    You are an expert satellite image analysis system for environmental monitoring in the Arctic.
    Analyze this image for any potential pollution spills like oil slicks or chemical plumes.
    If you detect any, provide their details. If there are no spills, return an empty array.
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
              description: "An array of detected pollution zones.",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "The type of pollution (e.g., 'Oil Slick', 'Chemical Plume')."
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: "Confidence score from 0.0 to 1.0."
                  },
                  geometry: {
                    type: Type.OBJECT,
                    description: "A GeoJSON Polygon object representing the spill's boundary. Coordinates should be [longitude, latitude].",
                    properties: {
                        type: { type: Type.STRING, description: "Should be 'Polygon'."},
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
    throw new Error("Failed to get analysis from Gemini API.");
  }
};
